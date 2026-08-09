/// <reference types="jest" />

import * as React from "react";
import * as ReactDom from "react-dom";
import { act, Simulate } from "react-dom/test-utils";

import { defaultBetterTextProperties } from "../../../shared/text";
import {
  createSpfxUiHost,
  SpfxUiHost,
  SpfxUiHostProvider,
  SpfxUiThemeTokens,
} from "../../../vendor/source-editor/ui-profile/lib/ui-root";
import {
  SPFX_UI_PROFILE_ID,
  SPFX_UI_SCOPE_VALUE,
} from "../../../vendor/source-editor/ui-profile/profile-contract";
import { BetterTextPropertyPane } from "./BetterTextPropertyPane";

jest.mock("../../../vendor/source-editor/SourceEditorField", () => ({
  SourceEditorField: (): null => null,
}));

class ResizeObserverStub {
  public disconnect(): void {}
  public observe(): void {}
  public unobserve(): void {}
}

const theme: SpfxUiThemeTokens = {
  mode: "light",
  colorBackground: "#ffffff",
  colorForeground: "#242424",
  colorCard: "#ffffff",
  colorCardForeground: "#242424",
  colorPopover: "#ffffff",
  colorPopoverForeground: "#242424",
  colorPrimary: "#0f6cbd",
  colorPrimaryForeground: "#ffffff",
  colorSecondary: "#f5f5f5",
  colorSecondaryForeground: "#242424",
  colorMuted: "#f0f0f0",
  colorMutedForeground: "#616161",
  colorAccent: "#ebf3fc",
  colorAccentForeground: "#115ea3",
  colorDestructive: "#c50f1f",
  colorBorder: "#d1d1d1",
  colorInput: "#8a8886",
  colorRing: "#0f6cbd",
  radiusSm: "0.25rem",
  radiusMd: "0.375rem",
  radiusLg: "0.5rem",
  radiusXl: "0.75rem",
  fontHeading: '"Segoe UI", SegoeUI, sans-serif',
};

describe("BetterTextPropertyPane", () => {
  const hosts: SpfxUiHost[] = [];

  beforeAll(() => {
    (
      window as unknown as { ResizeObserver: typeof ResizeObserverStub }
    ).ResizeObserver = ResizeObserverStub;
    (
      globalThis as unknown as {
        queueMicrotask: (callback: () => void) => void;
      }
    ).queueMicrotask = (callback) => {
      Promise.resolve().then(callback);
    };
  });

  afterEach(() => {
    while (hosts.length) {
      const host = hosts.pop();
      if (host) {
        ReactDom.unmountComponentAtNode(host.appRoot);
        host.dispose();
      }
    }
    document.body.innerHTML = "";
    document.head
      .querySelectorAll("[data-better-text-font]")
      .forEach((element) => element.remove());
  });

  it("filters and selects a font through the owned portal, then preserves the value on rerender", () => {
    const host = createTestHost("font-selection");
    const onChange = jest.fn();

    renderPane(host, "", onChange);
    const input = host.appRoot.querySelector<HTMLInputElement>(
      "input[aria-labelledby]",
    );
    expect(input).not.toBeNull();

    act(() => {
      input?.focus();
      (input as HTMLInputElement).value = "Roboto";
      Simulate.change(input as HTMLInputElement);
      Simulate.keyDown(input as HTMLInputElement, { key: "ArrowDown" });
    });

    expect(host.portalHost.textContent).toContain("Roboto");
    expect(host.portalHost.textContent).not.toContain("EB Garamond");
    const roboto = Array.from(
      host.portalHost.querySelectorAll<HTMLElement>('[role="option"]'),
    ).find((option) => option.textContent === "Roboto");
    expect(roboto).toBeDefined();

    act(() => {
      Simulate.click(roboto as HTMLElement);
    });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ fontFamily: "Roboto" }),
    );
    expect(
      document.head.querySelector('[data-better-text-font="Roboto"]'),
    ).not.toBeNull();

    renderPane(host, "Roboto", onChange);
    expect(
      host.appRoot.querySelector<HTMLInputElement>("input[aria-labelledby]")
        ?.value,
    ).toBe("Roboto");
  });

  it("supports keyboard selection, Escape focus return, and unique IDs across two hosts", () => {
    const firstHost = createTestHost("first");
    const secondHost = createTestHost("second");
    const firstChange = jest.fn();
    renderPane(firstHost, "", firstChange);
    renderPane(secondHost, "", jest.fn());

    const firstInput = firstHost.appRoot.querySelector<HTMLInputElement>(
      "input[aria-labelledby]",
    );
    act(() => {
      firstInput?.focus();
      (firstInput as HTMLInputElement).value = "Roboto";
      Simulate.change(firstInput as HTMLInputElement);
      Simulate.keyDown(firstInput as HTMLInputElement, { key: "ArrowDown" });
    });
    act(() => {
      Simulate.keyDown(firstInput as HTMLInputElement, { key: "ArrowDown" });
    });
    act(() => {
      Simulate.keyDown(firstInput as HTMLInputElement, { key: "Enter" });
    });
    expect(firstChange).toHaveBeenCalledWith(
      expect.objectContaining({ fontFamily: "Roboto" }),
    );

    act(() => {
      Simulate.click(firstInput as HTMLInputElement);
      Simulate.keyDown(firstInput as HTMLInputElement, { key: "Escape" });
    });
    expect(document.activeElement).toBe(firstInput);

    const ids = [
      ...Array.from(
        firstHost.appRoot.querySelectorAll<HTMLElement>("[id]"),
        (element) => element.id,
      ),
      ...Array.from(
        firstHost.portalHost.querySelectorAll<HTMLElement>("[id]"),
        (element) => element.id,
      ),
      ...Array.from(
        secondHost.appRoot.querySelectorAll<HTMLElement>("[id]"),
        (element) => element.id,
      ),
      ...Array.from(
        secondHost.portalHost.querySelectorAll<HTMLElement>("[id]"),
        (element) => element.id,
      ),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    expect(firstHost.portalHost.parentElement).toBe(document.body);
    expect(secondHost.portalHost.parentElement).toBe(document.body);
  });

  it("updates both property-pane surfaces when the SharePoint theme changes and removes them on teardown", () => {
    const host = createTestHost("theme-lifecycle");
    renderPane(host, "", jest.fn());
    const portalHost = host.portalHost;
    const appRoot = host.appRoot;

    act(() => {
      host.applyTheme({
        ...theme,
        mode: "dark",
        colorBackground: "#141414",
        colorForeground: "#f5f5f5",
      });
    });

    for (const surface of [appRoot, portalHost]) {
      expect(surface.getAttribute("data-spfx-ui-theme")).toBe("dark");
      expect(surface.style.getPropertyValue("--spfx-ui-color-background")).toBe(
        "#141414",
      );
    }

    ReactDom.unmountComponentAtNode(appRoot);
    host.dispose();
    hosts.splice(hosts.indexOf(host), 1);
    expect(appRoot.isConnected).toBe(false);
    expect(portalHost.isConnected).toBe(false);
  });

  function createTestHost(instanceId: string): SpfxUiHost {
    const mountPoint = document.createElement("div");
    document.body.append(mountPoint);
    const host = createSpfxUiHost({
      mountPoint,
      portalParent: document.body,
      targetDocument: document,
      instanceId,
      profileId: SPFX_UI_PROFILE_ID,
      scopeValue: SPFX_UI_SCOPE_VALUE,
      theme,
    });
    hosts.push(host);
    return host;
  }

  function renderPane(
    host: SpfxUiHost,
    fontFamily: string,
    onChange: jest.Mock,
  ): void {
    act(() => {
      ReactDom.render(
        <SpfxUiHostProvider host={host}>
          <BetterTextPropertyPane
            instanceId={host.instanceId}
            properties={{ ...defaultBetterTextProperties, fontFamily }}
            onChange={onChange}
          />
        </SpfxUiHostProvider>,
        host.appRoot,
      );
    });
  }
});
