from collections.abc import Sequence

import pandas as pd


MINIMUM_SCORE_PARAMETERS = 3
SCORE_METHOD = (
	"Mean of available parameter scores: within_range=100, attention=50, "
	"outside_range=0; unavailable values are excluded and at least 3 are required."
)


def calculate_score(statuses: Sequence[str]) -> float | None:
	points_by_status = {
		"within_range": 100,
		"attention": 50,
		"outside_range": 0,
	}
	scores = [points_by_status[status] for status in statuses if status in points_by_status]
	if len(scores) < MINIMUM_SCORE_PARAMETERS:
		return None
	return round(float(pd.Series(scores, dtype="float64").mean()), 1)
