// Now let me build this comprehensive Monte Carlo simulation for Indian stocks with full explanation and interactive visualizer.Now here's the complete Python code and all the theory you need to ace any question on this:

// ---

// ## Python Code

// ```python
// import numpy as np
// import pandas as pd
// import matplotlib.pyplot as plt
// import yfinance as yf

// # ── 1. Fetch real Indian stock data ────────────────────────────────────────────
// ticker = "RELIANCE.NS"           # .NS suffix for NSE, .BO for BSE
// data = yf.download(ticker, start="2020-01-01", end="2024-12-31")
// prices = data["Close"].dropna()

// # ── 2. Compute log returns ──────────────────────────────────────────────────────
// log_returns = np.log(prices / prices.shift(1)).dropna()
// mu_daily    = log_returns.mean()
// sigma_daily = log_returns.std()

// # Annualise (252 trading days in India — NSE calendar)
// mu_annual    = mu_daily * 252
// sigma_annual = sigma_daily * np.sqrt(252)
// print(f"Annual Return (μ): {mu_annual:.2%}")
// print(f"Annual Volatility (σ): {sigma_annual:.2%}")

// # ── 3. Monte Carlo via Geometric Brownian Motion ────────────────────────────────
// S0      = prices.iloc[-1]         # last known price
// T       = 252                     # forecast horizon: 1 trading year
// N_sims  = 1000                    # number of simulation paths
// dt      = 1/252                   # one trading day

// # GBM formula: S(t+dt) = S(t) * exp((μ - σ²/2)*dt  +  σ*√dt*Z)
// #   where Z ~ N(0,1) (standard normal random shock)
// drift    = (mu_annual - 0.5 * sigma_annual**2) * dt
// diffusion = sigma_annual * np.sqrt(dt)

// # Vectorised simulation (fast — no Python loops)
// Z         = np.random.standard_normal((T, N_sims))         # random shocks matrix
// daily_ret = np.exp(drift + diffusion * Z)                  # daily multipliers
// path_matrix = np.vstack([np.ones((1, N_sims)) * S0,        # shape: (T+1, N_sims)
//                           S0 * np.cumprod(daily_ret, axis=0)])

// # ── 4. Results & Risk Metrics ───────────────────────────────────────────────────
// final_prices = path_matrix[-1, :]   # all final prices

// median_price = np.percentile(final_prices, 50)
// p5  = np.percentile(final_prices, 5)
// p95 = np.percentile(final_prices, 95)

// prob_profit  = np.mean(final_prices > S0) * 100
// exp_return   = (np.mean(final_prices) - S0) / S0 * 100
// VaR_95       = S0 - p5                                    # Value at Risk

// print(f"\nStarting Price:    ₹{S0:,.2f}")
// print(f"Median (50th):     ₹{median_price:,.2f}")
// print(f"Upside (95th):     ₹{p95:,.2f}")
// print(f"Downside (5th):    ₹{p5:,.2f}")
// print(f"Prob. of Profit:   {prob_profit:.1f}%")
// print(f"Expected Return:   {exp_return:.1f}%")
// print(f"VaR (95%):         ₹{VaR_95:,.2f}")

// # ── 5. Plotting ─────────────────────────────────────────────────────────────────
// fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

// # Price paths
// ax1.plot(path_matrix[:, :100], alpha=0.08, color="steelblue", lw=0.7)
// ax1.plot(np.percentile(path_matrix, 50, axis=1), color="green", lw=2, label="Median")
// ax1.plot(np.percentile(path_matrix, 5, axis=1),  color="red",   lw=1.5, ls="--", label="5th/95th %ile")
// ax1.plot(np.percentile(path_matrix, 95, axis=1), color="red",   lw=1.5, ls="--")
// ax1.axhline(S0, color="black", lw=1, ls=":")
// ax1.set_title("Monte Carlo Price Paths")
// ax1.set_xlabel("Trading Days")
// ax1.set_ylabel("Price (₹)")
// ax1.legend()

// # Distribution
// ax2.hist(final_prices, bins=60, color=["red" if p < S0 else "green" for p in
//          np.histogram(final_prices, bins=60)[1][:-1]], edgecolor="none", alpha=0.7)
// ax2.axvline(S0, color="black", lw=1.5, label=f"Current ₹{S0:,.0f}")
// ax2.axvline(p5, color="red", lw=1.5, ls="--", label=f"VaR 5th ₹{p5:,.0f}")
// ax2.axvline(p95,color="green",lw=1.5, ls="--", label=f"95th ₹{p95:,.0f}")
// ax2.set_title("Final Price Distribution")
// ax2.set_xlabel("Final Price (₹)")
// ax2.legend()

// plt.tight_layout()
// plt.savefig("monte_carlo_nse.png", dpi=150)
// plt.show()
// ```

// ---

// ## The Logic — Everything You Need to Know

// ### What is Monte Carlo Simulation?

// It's a technique that runs thousands of "what-if" scenarios using randomness to model uncertainty. For stocks, you simulate thousands of possible future price paths and look at the distribution of outcomes. The more simulations you run, the more confident your probability estimates become.

// ### The Core Formula: Geometric Brownian Motion (GBM)

// Every path is governed by this equation:

// **S(t + dt) = S(t) × exp( (μ − σ²/2) × dt + σ × √dt × Z )**

// Where each variable means:
// - **S(t)** — stock price at time t
// - **μ (mu)** — expected annual return (drift) — e.g. NIFTY historically ~12%
// - **σ (sigma)** — annual volatility — how wildly the price swings
// - **dt** — one time step (1/252 for daily, since India has 252 NSE trading days)
// - **Z** — a random number drawn from Normal(0,1) — this is the "shock" each day

// The **σ²/2 correction** (called the Itô correction) is crucial. Without it, you'd be overestimating expected returns due to Jensen's inequality. GBM uses log-normal prices, meaning prices can never go below zero — which is realistic for stocks.

// ### Why Log Returns?

// You compute `log(P_t / P_{t-1})` instead of simple returns because log returns are:
// - **Additive** across time — easy to compound
// - **Symmetric** — a 50% gain and a 50% loss don't cancel in simple returns, but they do in log returns
// - **Normally distributed** (approximately), which lets us use N(0,1) random numbers

// ### The Drift and Diffusion Decomposition

// The exponent has two parts: the **drift term** `(μ − σ²/2) × dt` which is the predictable direction the stock is moving on average, and the **diffusion term** `σ × √dt × Z` which is the random daily shock. On any given day, the shock term dominates — that's why short-term stock prediction is nearly impossible, but long-term distribution estimates remain meaningful.

// ### Key Risk Metrics You'll Be Asked

// **Value at Risk (VaR 95%)** — the maximum loss you'd expect 95% of the time. If VaR is ₹500, it means in 95% of scenarios your loss won't exceed ₹500. The worst 5% of scenarios are excluded.

// **Probability of Profit** — the fraction of simulations where the final price > starting price. A value of 60% means in 6 out of 10 simulated futures, the stock ends higher.

// **Confidence Interval (5th–95th percentile)** — the band within which 90% of all outcomes fall. Wide bands = high volatility stock.

// ### Interview Questions You'll Face

// **Q: Why does volatility drag down returns?** — Because of the `σ²/2` correction. Higher volatility, even with the same average daily move, produces a lower geometric mean return. This is called volatility drag.

// **Q: What are GBM's limitations?** — It assumes constant volatility (real markets have volatility clustering), no jumps (crashes happen), log-normal returns (real returns have fat tails), and no memory (real stocks trend). More advanced models: Heston (stochastic volatility), Jump-Diffusion (Merton model), GARCH (volatility clustering).

// **Q: How many simulations are enough?** — For simple price forecasts, 1,000–10,000 is usually sufficient. For rare-event VaR at 99.9%, you may need 100,000+. You can check stability by comparing metrics between 1,000 and 10,000 runs.

// **Q: What inputs does the model need and how do you get them for an Indian stock?** — Pull at least 2–3 years of daily closing prices from NSE/BSE. Compute daily log returns. The mean annualised × 252 gives μ; the standard deviation annualised × √252 gives σ.

// **Q: How is this used in practice?** — Portfolio risk management, options pricing (Black-Scholes is a closed-form version of GBM), stress testing by SEBI-registered funds, and scenario analysis for IPO pricing.

// ---

// The interactive simulator above uses exactly this math — tweak the sliders to see how increasing σ widens the distribution cone, or how increasing μ shifts the entire distribution rightward.