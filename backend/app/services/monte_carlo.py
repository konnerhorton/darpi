import numpy as np


def run_simulation(
    risks: list[dict],
    iterations: int = 10_000,
    seed: int | None = None,
) -> dict:
    """
    Vectorized Monte Carlo simulation for aggregate risk cost.

    Each risk dict has: probability (0-100), cost_single, cost_min, cost_expected, cost_max.
    Returns distribution data for PDF/CDF charting.
    """
    if not risks:
        return _empty_result()

    rng = np.random.default_rng(seed)
    n = len(risks)

    # Bernoulli occurrence matrix: (n, iterations)
    probs = np.array([r["probability"] / 100.0 for r in risks])
    occurrences = rng.random((n, iterations)) < probs[:, np.newaxis]

    # Cost sample matrix: (n, iterations)
    costs = np.zeros((n, iterations))
    for i, r in enumerate(risks):
        if r.get("cost_min") is not None:
            costs[i] = rng.triangular(
                left=r["cost_min"],
                mode=r["cost_expected"],
                right=r["cost_max"],
                size=iterations,
            )
        elif r.get("cost_single") is not None:
            costs[i] = r["cost_single"]
        # else: costs stay 0

    # Total cost per iteration
    totals = (occurrences * costs).sum(axis=0)
    totals.sort()

    # Percentiles
    percentile_keys = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95]
    percentiles = {f"p{p}": float(np.percentile(totals, p)) for p in percentile_keys}

    # Filter out zero-cost iterations for charting (they drown the scale)
    nonzero = totals[totals > 0]
    zero_pct = float((totals == 0).sum() / iterations * 100)

    # Histogram for PDF (non-zero only)
    if len(nonzero) > 0:
        num_bins = min(80, max(20, len(nonzero) // 200))
        hist_counts, hist_edges = np.histogram(nonzero, bins=num_bins)
    else:
        hist_counts, hist_edges = np.array([]), np.array([])

    # CDF points (non-zero only, with correct cumulative probability)
    if len(nonzero) > 0:
        nonzero_sorted = np.sort(nonzero)
        step = max(1, len(nonzero_sorted) // 500)
        cdf_x = nonzero_sorted[::step].tolist()
        # Cumulative probability relative to ALL iterations (so starts above 0% if there are zeros)
        cdf_y = [
            float(zero_pct + (i / len(nonzero_sorted)) * (100 - zero_pct))
            for i in range(0, len(nonzero_sorted), step)
        ]
    else:
        cdf_x, cdf_y = [], []

    return {
        "iterations": iterations,
        "risk_count": n,
        "mean": float(totals.mean()),
        "std_dev": float(totals.std()),
        "min": float(totals[0]),
        "max": float(totals[-1]),
        "zero_pct": zero_pct,
        **percentiles,
        "histogram": {
            "bin_edges": hist_edges.tolist(),
            "counts": hist_counts.tolist(),
        },
        "cdf": {
            "x": cdf_x,
            "y": cdf_y,
        },
    }


def _empty_result() -> dict:
    return {
        "iterations": 0,
        "risk_count": 0,
        "mean": 0,
        "std_dev": 0,
        "min": 0,
        "max": 0,
        "p5": 0, "p10": 0, "p15": 0, "p20": 0, "p25": 0, "p30": 0, "p35": 0,
        "p40": 0, "p45": 0, "p50": 0, "p55": 0, "p60": 0, "p65": 0,
        "p70": 0, "p75": 0, "p80": 0, "p85": 0, "p90": 0, "p95": 0,
        "histogram": {"bin_edges": [], "counts": []},
        "cdf": {"x": [], "y": []},
    }
