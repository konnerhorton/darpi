import numpy as np
import pytest
from plotly.graph_objects import Figure

from darpi.config import CDFData, HistogramData, PPFData
from darpi.plots import plot_histogram_and_cdf, plot_ppf_curve


def test_plot_histogram_and_cdf():
    # Mock data for histogram and CDF
    hist_x = np.linspace(0, 10, 11)
    hist_y = np.random.rand(10)
    cdf_x = np.linspace(0, 10, 100)
    cdf_y = np.linspace(0, 1, 100)

    hist_data = HistogramData(cost=hist_x, frequency=hist_y)
    cdf_data = CDFData(cost=cdf_x, p=cdf_y)

    fig = plot_histogram_and_cdf(hist_data, cdf_data)

    assert isinstance(fig, Figure)
    assert len(fig.data) == 2  # One bar trace for histogram, one scatter trace for CDF

    # Check the bar trace
    bar_trace = fig.data[0]
    assert bar_trace.type == "bar"
    assert bar_trace.name == "Relative frequency"

    # Check the scatter trace
    scatter_trace = fig.data[1]
    assert scatter_trace.type == "scatter"
    assert scatter_trace.name == "Cumulative distribution"

    # Check layout
    layout = fig.layout
    assert layout.title.text == "Cumulative Distribution Function Curve"
    assert layout.xaxis.title.text == "Cost, $"
    assert layout.yaxis.title.text == "Relative frequency"
    assert layout.yaxis2.title.text == "Probability that value is not exceeded"


def test_plot_ppf_curve():
    # Mock data for PPF
    p_values = np.linspace(0, 100, 13)
    cost_values = np.random.rand(13) * 1000

    ppf_data = PPFData(cost=cost_values, p=p_values)

    fig = plot_ppf_curve(ppf_data)

    assert isinstance(fig, Figure)
    assert len(fig.data) == 1  # One bar trace for PPF

    # Check the bar trace
    bar_trace = fig.data[0]
    assert bar_trace.type == "bar"
    assert bar_trace.name == "Percent-Point Function Curve"

    # Check layout
    layout = fig.layout
    assert layout.title.text == "Percent-Point Function Curve"
    assert layout.xaxis.title.text == "Probability that value is not exceeded"
    assert layout.yaxis.title.text == "Cost, $"
