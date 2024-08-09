from collections import namedtuple

import numpy as np
import pytest
from scipy.stats import triang

from darpi.config import ITERATIONS, CDFData, HistogramData, PPFData
from darpi.probability import (  # create_cdf_data,; create_histogram_data,; create_ppf_curve_data,
    get_empirical_cdf,
    get_empirical_ppf,
    get_histogram_data,
    get_samples,
    get_triangular_distribution,
    sum_samples,
)

minimum, maximum, most_likely = 1, 3, 2
risk_probability = 0.5
distribution = get_triangular_distribution(a=minimum, b=maximum, c=most_likely)
distribution_type = type(triang(c=1))


def test_get_triangular_distribution():
    assert isinstance(distribution, distribution_type)
    assert distribution.kwds["c"] == (most_likely - minimum) / (maximum - minimum)
    assert distribution.kwds["loc"] == minimum
    assert distribution.kwds["scale"] == maximum - minimum


def test_get_samples():
    samples = get_samples(distribution=distribution, risk_probability=risk_probability)
    assert isinstance(samples, np.ndarray)
    assert len(samples) == ITERATIONS
    # TODO fix the below to handle distributions that include zero cost events (on the low end)
    assert len(samples[samples == 0]) == (1 - risk_probability) * ITERATIONS


def test_sum_samples():
    sample_sets = np.asarray([[1, 2, 3], [4, 5, 6]])
    summed_samples = sum_samples(sample_sets=sample_sets)
    assert (summed_samples == np.asarray([5, 7, 9])).all()


def test_get_empirical_cdf():
    data = np.asarray([1, 2, 3, 4])
    cdf_data = get_empirical_cdf(data)
    assert (cdf_data.cost == np.sort(data)).all()
    assert (cdf_data.p == np.asarray([0.25, 0.5, 0.75, 1])).all()


def test_get_empirical_ppf():
    data = np.random.rand(ITERATIONS)
    ppf_data = get_empirical_ppf(data)
    assert isinstance(ppf_data, PPFData)
    assert len(ppf_data.cost) == len(np.linspace(start=0, stop=1, num=101))
    assert len(ppf_data.p) == len(np.linspace(start=0, stop=1, num=101))


def test_get_histogram_data():
    data = np.random.rand(ITERATIONS)
    histogram_data = get_histogram_data(data=data)
    assert isinstance(histogram_data, HistogramData)
    assert len(histogram_data.cost) == 41
    assert len(histogram_data.frequency) == 40  # histogram returns len(bins) - 1
