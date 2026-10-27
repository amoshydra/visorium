export interface ViewerSettings {
  speed: number;
  lookSensitivity: number;
  zoomToCursor: boolean;
}

export const SPEED_RANGE = {
  min: 0.1,
  max: 2.5,
  step: 0.1,
} as const;

export const LOOK_RANGE = {
  min: 0.1,
  max: 1.5,
  step: 0.05,
} as const;

export const DEFAULT_VIEWER_SETTINGS: ViewerSettings = {
  speed: 0.8,
  lookSensitivity: 0.6,
  zoomToCursor: false,
};

export const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
};
