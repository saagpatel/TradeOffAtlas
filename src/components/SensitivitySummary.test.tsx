import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SensitivitySummary } from "../lib/scoring";
import { CriteriaWeightSlider } from "./CriteriaWeightSlider";
import { RankChangeAlert } from "./RankChangeAlert";
import { SensitivitySummary as SensitivitySummaryCard } from "./SensitivitySummary";

function summary(
	overrides: Partial<SensitivitySummary> = {},
): SensitivitySummary {
	const option = {
		optionId: 1,
		optionName: "Option A",
		weightedTotal: 58,
		normalizedScore: 72.5,
		rank: 1,
		scores: {},
	};
	return {
		baselineLeader: option,
		currentLeader: option,
		baselineMargin: 6,
		currentMargin: 6,
		rankChangeCount: 0,
		status: "stable",
		...overrides,
	};
}

describe("SensitivitySummary", () => {
	it("renders an accessible stability status and winner metrics", () => {
		const html = renderToStaticMarkup(
			<SensitivitySummaryCard summary={summary()} />,
		);

		expect(html).toContain('aria-labelledby="sensitivity-summary-heading"');
		expect(html).toContain('role="status"');
		expect(html).toContain("Stable ranking");
		expect(html).toContain("Baseline winner");
		expect(html).toContain("Current winner");
		expect(html).toContain("6.0 pts");
	});

	it("explains a flipped result to assistive technology", () => {
		const html = renderToStaticMarkup(
			<SensitivitySummaryCard
				summary={summary({
					status: "flipped",
					currentLeader: {
						...summary().currentLeader!,
						optionId: 2,
						optionName: "Option B",
					},
					currentMargin: 3,
					rankChangeCount: 2,
				})}
			/>,
		);

		expect(html).toContain("Decision flipped");
		expect(html).toContain("Option B replaced Option A");
		expect(html).toContain("2 options changed rank");
	});

	it("connects each weight slider to its label and baseline context", () => {
		const html = renderToStaticMarkup(
			<CriteriaWeightSlider
				criterionId={7}
				criterionName="Cost"
				baselineWeight={5}
				currentWeight={2.5}
				onChange={() => undefined}
			/>,
		);

		expect(html).toContain('for="criterion-weight-7"');
		expect(html).toContain('aria-label="Cost weight"');
		expect(html).toContain('aria-valuenow="2.5"');
		expect(html).toContain('aria-valuetext="2.5 out of 10"');
		expect(html).toContain('aria-describedby="criterion-weight-7-baseline"');
	});

	it("announces rank changes with a semantic movement label", () => {
		const html = renderToStaticMarkup(
			<RankChangeAlert
				rankChanges={[
					{
						optionId: 2,
						optionName: "Option B",
						previousRank: 2,
						newRank: 1,
						triggeredByCriterionId: -1,
					},
				]}
			/>,
		);

		expect(html).toContain('role="status"');
		expect(html).toContain('aria-live="polite"');
		expect(html).toContain(
			'aria-label="Option B moved from rank 2 to rank 1"',
		);
	});
});
