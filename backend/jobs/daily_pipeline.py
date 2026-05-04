from jobs.update_prices import update_prices
from jobs.update_statistics import update_statistics
from jobs.compute_features import compute_all_features


def run_pipeline():

    print("Updating prices")
    update_prices()

    print("Updating statistics")
    update_statistics()

    print("Computing indicators")
    compute_all_features()

    print("Pipeline finished")


if __name__ == "__main__":
    run_pipeline()