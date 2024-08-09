from collections import namedtuple

ITERATIONS = int(1e5)
PPFData = namedtuple("PPFData", ["cost", "p"])
HistogramData = namedtuple("HistogramData", ["cost", "frequency"])
CDFData = namedtuple("CDFData", ["cost", "p"])
