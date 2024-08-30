import numpy as np
import plotly.graph_objects as go


def plot_empty_heat_map(low: int = 1, high: int = 5) -> go.Figure:
    """
    Creates an empty heat map with customizable axis range and color scale.

    Parameters:
    -----------
    low : int, optional
        The lower bound of the axis range, by default 1.
    high : int, optional
        The upper bound of the axis range, by default 5.

    Returns:
    --------
    go.Figure
        A Plotly figure object representing the empty heat map.
    """
    axis_range = [low - 0.5, high + 0.5]
    array = np.linspace(axis_range[0], axis_range[1])

    custom_color_scale = [
        [0.0, "green"],
        [0.1, "yellow"],
        [1.0, "red"],
    ]

    res = np.outer(array, array)

    fig = go.Figure(
        data=go.Contour(
            z=res,
            x=array,
            y=array,
            contours=dict(coloring="heatmap"),
            colorscale=custom_color_scale,
            line_width=0,
            showscale=False,
        )
    ).update(
        layout=dict(
            height=600,
            width=600,
            xaxis=dict(
                title=dict(text="Probability of Occurrence", font_size=18),
                range=axis_range,
                mirror=True,
                constrain="domain",
                showgrid=False,
                tickfont=dict(size=16),
            ),
            yaxis=dict(
                title=dict(text="Impact", font_size=18),
                range=axis_range,
                mirror=True,
                constrain="domain",
                scaleanchor="x",
                scaleratio=1,
                showgrid=False,
                tickfont=dict(size=16),
            ),
        )
    )

    grid_lines = np.arange(axis_range[0], axis_range[1])[1:]
    for i in grid_lines:
        fig.add_vline(x=i, line=dict(color="black", width=2))
        fig.add_hline(y=i, line=dict(color="black", width=2))

    return fig


def add_scatter_to_heat_map(
    risk_score_counts: list[dict[str, float]], title: str
) -> go.Figure:
    """
    Adds a scatter plot to the heat map, representing risks with their impact and probability.

    Parameters:
    -----------
    risks : List[Dict[str, Any]]
        A list of dictionaries where each dictionary contains 'impact', 'probability',
        and 'counts' keys, representing the risk's impact, probability, and occurrence count.
    title : str
        The title of the resulting heat map with scatter plot.

    Returns:
    --------
    go.Figure
        A Plotly figure object representing the heat map with the added scatter plot.
    """
    impacts = np.array([risk["impact"] for risk in risks])
    probabilities = np.array([risk["probability"] for risk in risks])
    counts = np.array([risk["counts"] for risk in risks])

    gmean_prob = (probabilities * counts).sum() / counts.sum()
    gmean_impact = (impacts * counts).sum() / counts.sum()
    max_count = max(counts)

    marker_size = 12
    sizeref = (max_count / (marker_size**2)) / 12
    mean_label_offset = 0.2

    scatter = go.Scatter(
        x=probabilities,
        y=impacts,
        text=counts,
        textfont=dict(size=14),
        mode="markers+text",
        hoverinfo="none",
        showlegend=False,
        marker=dict(
            size=counts,
            sizemode="area",
            sizeref=sizeref,
            color="#63967D",
            opacity=1,
        ),
    )

    fig = plot_empty_heat_map()
    fig.add_trace(scatter).add_trace(
        go.Scatter(
            x=[gmean_prob],
            y=[gmean_impact],
            marker=dict(
                symbol="cross",
                size=16,
                color="red",
            ),
            showlegend=False,
        )
    ).add_annotation(
        text=f"<b>P:{gmean_prob:.2f}, I:{gmean_impact:.2f}</b>",
        font=dict(size=14),
        x=gmean_prob,
        y=gmean_impact - mean_label_offset,
        showarrow=False,
    ).update(
        layout=dict(title=dict(text=title, font=dict(size=18)))
    )

    return fig
