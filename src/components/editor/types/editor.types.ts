export type EditorProps = {
  initialContent?: any;
  onChange?: (content: any) => void;
};

export type Coordinates = {
  top: number;
  left: number;
};

export type FloatingMenuType = "selection" | "slash";

export interface MenuState {
  isOpen: boolean;
  type: FloatingMenuType | null;
  position: Coordinates;
}