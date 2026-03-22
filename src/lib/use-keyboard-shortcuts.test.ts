import { describe, expect, it } from "vitest";
import { matchShortcut } from "./use-keyboard-shortcuts";

describe("matchShortcut", () => {
	it("Cmd+1 returns canvas view action", () => {
		expect(matchShortcut("1", true, "canvas", false)).toEqual({
			type: "setView",
			view: "canvas",
		});
	});

	it("Cmd+4 returns history view action", () => {
		expect(matchShortcut("4", true, "canvas", false)).toEqual({
			type: "setView",
			view: "history",
		});
	});

	it("Cmd+N returns newDecision even when in editable", () => {
		expect(matchShortcut("n", true, "canvas", true)).toEqual({
			type: "newDecision",
		});
	});

	it("Cmd+/ returns toggleHelp", () => {
		expect(matchShortcut("/", true, "canvas", false)).toEqual({
			type: "toggleHelp",
		});
	});

	it("Cmd+E returns export on canvas view", () => {
		expect(matchShortcut("e", true, "canvas", false)).toEqual({
			type: "export",
		});
	});

	it("Cmd+E returns null on non-canvas view", () => {
		expect(matchShortcut("e", true, "sensitivity", false)).toBeNull();
	});

	it("Cmd+1 returns null when in editable element", () => {
		expect(matchShortcut("1", true, "canvas", true)).toBeNull();
	});

	it("1 without Cmd returns null", () => {
		expect(matchShortcut("1", false, "canvas", false)).toBeNull();
	});

	it("Cmd+[ returns prevView", () => {
		expect(matchShortcut("[", true, "canvas", false)).toEqual({
			type: "prevView",
		});
	});

	it("Cmd+] returns nextView", () => {
		expect(matchShortcut("]", true, "canvas", false)).toEqual({
			type: "nextView",
		});
	});

	it("Cmd+/ returns toggleHelp even when in editable", () => {
		expect(matchShortcut("/", true, "canvas", true)).toEqual({
			type: "toggleHelp",
		});
	});

	it("Cmd+2 returns sensitivity view action", () => {
		expect(matchShortcut("2", true, "canvas", false)).toEqual({
			type: "setView",
			view: "sensitivity",
		});
	});

	it("Cmd+3 returns templates view action", () => {
		expect(matchShortcut("3", true, "history", false)).toEqual({
			type: "setView",
			view: "templates",
		});
	});

	it("Cmd+[ returns null when in editable element", () => {
		expect(matchShortcut("[", true, "canvas", true)).toBeNull();
	});

	it("unrecognized key returns null", () => {
		expect(matchShortcut("z", true, "canvas", false)).toBeNull();
	});
});
