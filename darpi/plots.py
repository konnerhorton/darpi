import numpy as np
import plotly.graph_objects as go
import plotly.io as pio

from darpi.config import ITERATIONS, CDFData, HistogramData, PPFData

# Set plotting template
pio.templates["simple_white"]["layout"]["xaxis"]["mirror"] = True
pio.templates["simple_white"]["layout"]["yaxis"]["mirror"] = True
pio.templates["simple_white"]["layout"]["xaxis"]["showgrid"] = True
pio.templates["simple_white"]["layout"]["yaxis"]["showgrid"] = True
pio.templates["simple_white"]["layout"]["font"]["family"] = "Helvetica"
pio.templates.default = "simple_white"

# TODO Write a function to plot both the cdf/pdf curve and the ppf bars in the same fig (two subplots)


# TODO Make this name more descriptive
# TODO make internal function to perform more of the operations for the PDF-CDF curve. The user should just put in min, ml, and max.


def plot_histogram_and_cdf(hist_data: HistogramData, cdf_data: CDFData) -> go.Figure:
    """
    Plot the histogram and cumulative distribution function using Plotly.

    Parameters
    ----------
    hist_data : HistogramData
        Data for the histogram containing bin centers and relative frequencies.
    cdf_data : CDFData
        Data for the cumulative distribution function containing x and y values.

    Returns
    -------
    go.Figure
        Plotly figure object with the histogram and CDF.
    """
    hist_x, hist_y = hist_data
    cdf_x, cdf_y = cdf_data
    max_hist_y = max(hist_y)
    fig = go.Figure()

    # Add histogram
    fig.add_trace(
        go.Bar(
            x=hist_x,
            y=hist_y,
            name="Relative frequency",
            opacity=0.75,
            yaxis="y1",
        )
    )

    # Add cumulative distribution line
    fig.add_trace(
        go.Scatter(
            x=cdf_x,
            y=cdf_y,
            name="Cumulative distribution",
            mode="lines",
            yaxis="y2",
        )
    )

    # Update layout
    fig.update_layout(
        height=500,
        width=800,
        title="Cumulative Distribution Function Curve",
        xaxis=dict(title="Cost, $", showgrid=False),
        yaxis=dict(
            title="Relative frequency",
            side="left",
            range=[0, max_hist_y * 1.1],
            tickformat=".2%",
            showgrid=False,
        ),
        yaxis2=dict(
            title="Probability that value is not exceeded",
            side="right",
            overlaying="y",
            range=[0, 1],
            tickformat=".0%",
            showgrid=False,
        ),
        showlegend=False,
        bargap=0.1,
    )

    return fig


def plot_ppf_curve(data: PPFData) -> go.Figure:
    """
    Plot the PPF (Percent-Point Function) curve using Plotly.

    Parameters
    ----------
    data : LorenzData
        Data containing binned sample values and their cumulative percentages.

    Returns
    -------
    go.Figure
        Plotly figure object with the PPF curve.
    """
    # TODO make function for user to input min, max, ml and plot this (instead of the intermediate steps)
    p_bars = np.linspace(0, 1, 21)
    default_bar_color = "#5799C6"
    p_bar_color = "#FF7F0E"
    colors = [p_bar_color if x in p_bars else default_bar_color for x in data.p]
    fig = go.Figure()

    fig.add_trace(
        go.Bar(
            x=data.p,
            y=data.cost,
            name="Percent-Point Function Curve",
            marker_color=colors,
            opacity=0.75,
        )
    )
    fig.update_layout(
        height=500,
        width=800,
        title="Percent-Point Function Curve",
        xaxis=dict(title="Probability that value is not exceeded", range=[0, 1]),
        yaxis=dict(title="Cost, $"),
    )

    return fig
