/** Supported browser providers. */
export enum BrowserProvider {
  Playwright = "playwright",
}

/** The browser viewport used for a page session. */
export interface ViewportConfiguration {
  width: number;
  height: number;
}

/** Browser settings consumed by the browser infrastructure layer. */
export interface BrowserConfiguration {
  provider: BrowserProvider;
  headless: boolean;
  timeout: number;
  viewport: ViewportConfiguration;
  url: string;
}
