from collections import namedtuple

import numpy as np
from scipy import stats
from scipy.stats import rv_continuous

from darpi.config import ITERATIONS, CDFData, HistogramData, PPFData

# TODO function to provide output P values (user inputs min, ml, max with desired p vals, output is the p vals)
# TODO combine multiple distributions into a single (so if there are multiple risks, the total cost can be determined)
# TODO do more exception/error handling


def get_triangular_distribution(a: float, b: float, c: float) -> rv_continuous:
    """
    Generate a triangular distribution given the mode and the range.

    Parameters
    ----------
    a : float
        The lower bound of the distribution.
    b : float
        The upper bound of the distribution.
    c : float
        The mode of the distribution (must be between `a` and `b`).

    Returns
    -------
    rv_continuous
        A frozen `rv_continuous` object representing the triangular distribution.

    Notes
    -----
    The triangular distribution is defined by three parameters:
    - `a` is the minimum value,
    - `b` is the maximum value,
    - `c` is the mode (the peak of the distribution).
    """
    range_val = b - a
    c_shape = (c - a) / range_val
    return stats.triang(c=c_shape, loc=a, scale=range_val)


def get_samples(distribution: rv_continuous, risk_probability: float) -> np.ndarray:
    """
    Generate samples from a given distribution based on a risk probability.

    Parameters
    ----------
    distribution : rv_continuous
        A frozen `rv_continuous` object from which samples are to be drawn.
    risk_probability : float
        The probability of risk occurrence, determining the proportion of non-zero samples.

    Returns
    -------
    np.ndarray
        An array of samples, where a portion of the samples is drawn from the distribution
        and the remainder are zeros, based on the risk probability.

    Notes
    -----
    The number of samples is determined by a constant `ITERATIONS`.
    """
    samples = np.zeros(ITERATIONS)
    occurrences = int(ITERATIONS * risk_probability)
    samples[0:occurrences] = distribution.rvs(occurrences)
    np.random.shuffle(samples)
    return samples


def sum_samples(sample_sets: list[np.ndarray]) -> np.ndarray:
    """
    Sum multiple sets of samples element-wise.

    Parameters
    ----------
    sample_sets : list of np.ndarray
        A list of sample arrays to be summed.

    Returns
    -------
    np.ndarray
        An array representing the element-wise sum of the input sample arrays.

    Notes
    -----
    All arrays in `sample_sets` must have the same shape.
    """
    return np.add.reduce(sample_sets)


def get_empirical_cdf(data: np.ndarray) -> np.ndarray:
    """
    Calculate the empirical cumulative distribution function (CDF) for a dataset.

    Parameters
    ----------
    data : np.ndarray
        The data array for which to compute the empirical CDF.

    Returns
    -------
    CDFData
        An object containing the sorted data and corresponding cumulative probabilities.

    Notes
    -----
    The empirical CDF is the proportion of data points less than or equal to a given value.
    """
    n = len(data)
    p = np.arange(1, n + 1) / n
    return CDFData(cost=np.sort(data), p=p)


def get_empirical_ppf(data: np.ndarray) -> PPFData:
    """
    Calculate the empirical percent-point function (PPF) for a dataset.

    Parameters
    ----------
    data : np.ndarray
        The data array for which to compute the empirical PPF.

    Returns
    -------
    PPFData
        An object containing the cost values at each percentile and the corresponding percentiles.

    Notes
    -----
    The empirical PPF is the inverse of the empirical CDF, mapping percentiles to data values.
    """
    p_values = np.linspace(start=0, stop=1, num=101)
    sorted_data = np.sort(data)
    cumulative_probs = np.linspace(0, 1, len(sorted_data), endpoint=False)
    cumulative_probs += 1 / len(sorted_data)
    cost = np.interp(p_values, cumulative_probs, sorted_data)
    return PPFData(cost=cost, p=p_values)


def get_histogram_data(data: np.ndarray) -> HistogramData:
    """
    Calculate histogram data, excluding zero values and normalizing by total data points.

    Parameters
    ----------
    data : np.ndarray
        The data array for which to compute the histogram.

    Returns
    -------
    HistogramData
        An object containing the histogram bin edges and the normalized frequency.

    Notes
    -----
    The histogram is computed excluding zero values in the data.
    Frequencies are normalized by the total number of data points.
    """
    non_zero_data = data[data != 0]
    num_bins = 40
    hist, bin_edges = np.histogram(non_zero_data, bins=num_bins)
    total_data_points = len(data)
    frequency_including_zeros = hist / total_data_points
    return HistogramData(cost=bin_edges, frequency=frequency_including_zeros)


def get_aggregate_data(
    risks: dict[str, dict[str, tuple[int, int, int] | float]]
) -> np.ndarray:
    """
    Generate aggregate sample data based on multiple risk scenarios.

    This function processes a dictionary of risk scenarios where each scenario has associated costs
    and a probability of occurrence. It generates sample data for each risk using a triangular distribution
    and aggregates these samples into a single dataset.

    Parameters
    ----------
    risks : dict of str to dict of str to tuple or float
        A dictionary where the keys are risk names (str), and the values are dictionaries containing:
        - "costs": A tuple of three integers representing the minimum cost, mode, and maximum cost.
        - "probability": A float representing the probability of the risk occurring.

    Returns
    -------
    np.ndarray
        An array of aggregated samples from all the provided risks, where each risk's samples are
        generated based on its triangular distribution and probability.

    Notes
    -----
    - The triangular distribution is generated using the costs provided for each risk, where:
      - `a` is the minimum cost,
      - `c` is the mode (most likely cost),
      - `b` is the maximum cost.
    - The number of samples generated for each risk is proportional to the risk's probability.
    - The samples from all risks are summed element-wise to produce the final aggregated data.

    Example
    -------
    Example of `risks` dictionary structure:

    >>> risks = {
    >>>     "Risk 1": {"costs": (1000, 2000, 5000), "probability": 1},
    >>>     "Risk 2": {"costs": (2000, 4000, 8000), "probability": 0.8},
    >>>     "Risk 3": {"costs": (2800, 4000, 10000), "probability": 0.5},
    >>> }
    >>> samples = get_aggregate_data(risks)
    """
    for risk, details in risks.items():
        a, c, b = details["costs"]
        risk_probability = details["probability"]
        distribution = get_triangular_distribution(a, b, c)
        data = get_samples(distribution=distribution, risk_probability=risk_probability)
        risks[risk]["samples"] = data
    samples = sum_samples([risk["samples"] for risk in risks.values()])
    return samples
