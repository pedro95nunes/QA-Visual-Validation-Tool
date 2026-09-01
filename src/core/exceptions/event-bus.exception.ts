import { AtlasException } from "./atlas.exception";

/** Indicates that an event could not be published or dispatched. */
export class EventBusException extends AtlasException {}
