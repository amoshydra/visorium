import { Masonry, RenderComponentProps } from "masonic";
import { useDeferredValue, useMemo, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { MediaInfo, useFileServerSocket } from "../hooks/useFileServerSocket";
import { Media } from "./Media";
import { MenuUi } from "./MenuUi";

export function ImageGallery() {
  const files = useFileServerSocket();
  const [columnWidth, setColumnWidth] = useState(280);
  const [filter, setFilter] = useState("");

  const deferredFilter = useDeferredValue(filter);

  const filteredFiles = useMemo(() => {
    if (!deferredFilter.trim()) return files;
    try {
      const re = new RegExp(deferredFilter, "i");
      return files.filter((file) => re.test(file.name));
    } catch (_) {
      return [];
    }
  }, [files, deferredFilter]);

  return (
    <MenuUi
      controller={{
        columnWidth,
        onColumnWidthChange: (width) => {
          setColumnWidth(width);
        },
        filter,
        onFilterChange: (value) => {
          setFilter(value);
        },
        filteredFiles,
      }}
    >
      <ErrorBoundary
        fallbackRender={({ error, resetErrorBoundary }) => (
          <div>
            <p>Something went wrong:</p>
            <pre>{error.message}</pre>
            <button onClick={resetErrorBoundary}>Try again</button>
          </div>
        )}
      >
        <Masonry
          columnWidth={columnWidth}
          items={filteredFiles}
          itemKey={(data, index) => data?.src ?? index}
          render={MasonryCard}
        />
      </ErrorBoundary>
    </MenuUi>
  );
}

const MasonryCard = ({
  data: { name, src, aspectRatio },
}: RenderComponentProps<MediaInfo>) => (
  <Media name={name} src={src} aspectRatio={aspectRatio} />
);
