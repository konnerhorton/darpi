import numpy as np
import pandas as pd

from darpi.quantitative.probability import get_empirical_ppf


def get_non_exceedance_table(data: np.ndarray) -> pd.DataFrame:
    """
    Generate a non-exceedance probability table from empirical data.

    This function calculates the empirical percent-point function (PPF) from the provided data and
    returns it as a pandas DataFrame. The PPF, also known as the quantile function, represents the
    inverse of the cumulative distribution function (CDF), mapping probability values to data values.

    Parameters
    ----------
    data : np.ndarray
        An array of data points from which to compute the empirical PPF.

    Returns
    -------
    pd.DataFrame
        A DataFrame containing the non-exceedance probabilities and corresponding data values.
        The columns of the DataFrame correspond to the fields of the `PPFData` namedtuple, typically:
        - `cost`: The data values at each quantile.
        - `p`: The corresponding non-exceedance probabilities (percentiles).

    Notes
    -----
    - The non-exceedance probability, `p`, represents the probability that a randomly selected
      value from the distribution will be less than or equal to a given value.
    - This function is particularly useful in risk analysis, where non-exceedance probabilities
      are used to understand the likelihood of different cost outcomes.

    Example
    -------
    Example usage of `get_non_exceedance_table`:

    >>> data = np.array([1000, 2000, 3000, 4000, 5000])
    >>> non_exceedance_table = get_non_exceedance_table(data)
    >>> print(non_exceedance_table)

    This might output a DataFrame where each row represents a specific quantile and the corresponding
    data value at that quantile.

    """
    ppf_data = get_empirical_ppf(data)
    return pd.DataFrame({field: getattr(ppf_data, field) for field in ppf_data._fields})
