import { ReactElement, useEffect, useRef, useState } from "react";
import css from "./MenuUi.module.css";

export interface MenuUiProps {
  children: React.ReactNode;
  controller: {
    columnWidth: number;
    onColumnWidthChange: (width: number) => void;
    filter: string;
    onFilterChange: (value: string) => void;
    filteredFiles: {
      src: string;
    }[];
  };
}

type MenuOpenData =
  | false
  | {
      x: number;
      y: number;
      target: HTMLElement;
    };

export const MenuUi = ({ children, controller }: MenuUiProps) => {
  const [menuOpenData, setMenuOpenData] = useState<MenuOpenData>(false);
  const openMenu = (e: React.MouseEvent<HTMLElement>) => {
    setMenuOpenData({
      x: e.pageX,
      y: e.pageY,
      target: e.target as HTMLElement,
    });
    e.stopPropagation();
    e.preventDefault();
    return false;
  };
  return (
    <div onDoubleClickCapture={openMenu} onContextMenuCapture={openMenu}>
      <>
        {children}
        {
          <Popover
            menuOpenData={menuOpenData}
            onDismiss={() => {
              setMenuOpenData(false);
            }}
          >
            <Controller
              controller={controller}
              onDismiss={() => {
                setMenuOpenData(false);
              }}
            />
          </Popover>
        }
      </>
    </div>
  );
};

const Popover = ({
  menuOpenData: menuOpenData,
  onDismiss,
  children,
}: {
  menuOpenData: MenuOpenData;
  onDismiss: () => void;
  children: ReactElement;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    window.addEventListener("click", (e) => {
      if (!ref.current) return;
      if (e.composedPath().includes(ref.current)) return;
      onDismiss();
    });
  }, [onDismiss]);
  if (!menuOpenData) return;

  return (
    <div
      ref={ref}
      onToggle={({ currentTarget }) => {
        currentTarget.hidePopover();
      }}
      className={css.popover}
    >
      <div className={css.popoverContent}>{children}</div>
    </div>
  );
};

interface ControllerProps {
  onDismiss: () => void;
  controller: MenuUiProps["controller"];
}

const Controller = (props: ControllerProps) => {
  const {
    columnWidth,
    onColumnWidthChange,
    filter,
    onFilterChange,
    filteredFiles,
  } = props.controller;
  return (
    <div className={css.controller}>
      <button
        className={css.popoverCloseButton}
        onClick={() => props.onDismiss()}
      >
        x
      </button>
      <div>
        <label>
          <div>Filter:</div>
          <input
            value={filter}
            onChange={(e) => {
              onFilterChange(e.target.value);
            }}
          />
        </label>
        <div className={css.fileList}>
          {filteredFiles.slice(0, 5).map((file) => (
            <div key={file.src} className={css.fileListItem}>
              {decodeURIComponent(file.src)}
            </div>
          ))}
          {filteredFiles.length > 5 && (
            <div className={css.fileListItem}>
              and {filteredFiles.length - 5} more...
            </div>
          )}
        </div>
      </div>
      <label>
        <div>Columns: {Math.floor(window.innerWidth / columnWidth) || 1}</div>
        <input
          type="range"
          min={90}
          max={1000}
          step={100}
          value={columnWidth}
          onChange={(e) => {
            onColumnWidthChange(Number(e.target.value));
          }}
        />
      </label>
    </div>
  );
};
