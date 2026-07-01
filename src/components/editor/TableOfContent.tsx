
import { TextSelection } from '@tiptap/pm/state'
export const ToCItem = ({
  item,
  onItemClick,
}: {
  item: any;
  onItemClick: (...args: any[]) => void;
}) => {
  const baseClasses =
    "pl-[calc(var(--level)*0.5rem)] py-1 transition-colors duration-200";

  const activeClasses =
    "font-semibold text-blue-600 dark:text-blue-400"; // active item color
  const scrolledOverClasses =
    "bg-gray-100 dark:bg-gray-700"; // highlight on scroll-over

  return (
    <div
      className={`${baseClasses} ${
        item.isActive && !item.isScrolledOver ? activeClasses : ""
      } ${item.isScrolledOver ? scrolledOverClasses : ""}`}
      style={{ "--level": item.level } as React.CSSProperties}
    >
      <a
        className="text-sm text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
        href={`#${item.id}`}
        onClick={(e) => onItemClick(e, item.id)}
        data-item-index={item.itemIndex}
      >
        {item.textContent}
      </a>
    </div>
  );
};

export const ToCEmptyState = () => {
  return (
    <div className="empty-state">
      <p>Start editing your document to see the outline.</p>
    </div>
  )
}

export const TableOfContent = ({ items = [], editor }:{items:any[],editor:any}) => {
  if (items.length === 0) {
    return <ToCEmptyState />
  }

  const onItemClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    if (!editor) return

    const element = editor.view.dom.querySelector(
      `[data-toc-id="${id}"]`
    )

    if (!element) return

    // 1️⃣ Move editor selection (Keep your existing logic)
    const pos = editor.view.posAtDOM(element, 0)
    const tr = editor.view.state.tr
    tr.setSelection(new TextSelection(tr.doc.resolve(pos)))
    editor.view.dispatch(tr)
    editor.view.focus()

    // 2️⃣ Update URL hash (optional)
    history.pushState(null, "", `#${id}`)

    // 3️⃣ 🔥 FIX: Find the actual scrollable container
    // We look for the class "overflow-y-auto" which you defined in Editor.tsx
    const scrollContainer = editor.view.dom.closest('.overflow-y-auto');

    if (scrollContainer) {
      const elementRect = element.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();
      
      // Calculate the exact position to scroll to
      // currentScroll + (element's distance from top of screen - container's distance from top of screen)
      const offsetPosition = scrollContainer.scrollTop + (elementRect.top - containerRect.top);

      scrollContainer.scrollTo({
        top: offsetPosition - 32, // -32px for padding/breathing room
        behavior: "smooth",
      })
    }
  }

  return (
    <>
      {items.map(item => (
        <ToCItem
          key={item.id}
          item={item}
          onItemClick={onItemClick}
        />
      ))}
    </>
  )
}


