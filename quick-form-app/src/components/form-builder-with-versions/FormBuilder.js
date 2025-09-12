import React, { useRef, useEffect, useState } from 'react';
import FormField from './FormField';

function FormBuilder({
  fields = [],
  onDrop,
  onReorder,
  onUpdateField,
  onDeleteField,
  showSidebar,
  setShowSidebar,
  setSelectedFieldId,
  setSelectedSectionSide,
  setSelectedFooter,
  selectedFieldId,
  onDeletePage,
  selectedSectionSide,
  setClipboard,
  clipboard,
  selectedTheme,
  currentPageIndex,
  setCurrentPageIndex,
  onAddPage,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onMovePageUp,
  onMovePageDown,
  isSidebarOpen = true,
  footerConfigs = [],
  setFooterConfigs
}) {
  const fieldsContainerRef = useRef(null);
  const pageRefs = useRef([]);
  const [isScrolling, setIsScrolling] = useState(false);
  const [pageWindowStart, setPageWindowStart] = useState(0);
  const maxVisiblePages = 5;

  // Organize fields into pages
  const nonHeaderFields = fields.filter((field) => field?.type !== 'header');

  const pages = [];
  let currentPage = [];
  nonHeaderFields.forEach((field) => {
    if (field.type === 'pagebreak') {
      pages.push({ fields: currentPage, name: `Page ${pages.length + 1}` });
      currentPage = [];
    } else {
      currentPage.push(field);
    }
  });
  if (currentPage.length > 0 || pages.length === 0) {
    pages.push({ fields: currentPage, name: `Page ${pages.length + 1}` });
  }

  // Initialize pageRefs
  useEffect(() => {
    pageRefs.current = pageRefs.current.slice(0, pages.length);
  }, [pages.length]);

  useEffect(() => {
    if (currentPageIndex < pageWindowStart) {
      setPageWindowStart(currentPageIndex);
    } else if (currentPageIndex >= pageWindowStart + maxVisiblePages) {
      setPageWindowStart(currentPageIndex - maxVisiblePages + 1);
    }
  }, [currentPageIndex]);

  useEffect(() => {
    // When pages are removed (e.g., via undo), adjust pageWindowStart if needed
    if (pageWindowStart + maxVisiblePages > pages.length) {
      setPageWindowStart(Math.max(0, pages.length - maxVisiblePages));
    }
  }, [pages.length, pageWindowStart]);

  // Track if page change was from explicit navigation (not from adding pages)
  const [isExplicitNavigation, setIsExplicitNavigation] = useState(false);

  // Scroll to current page when currentPageIndex changes (only when user explicitly navigates)
  useEffect(() => {
    // Only auto-scroll if user explicitly navigated and it's not during scrolling
    if (pageRefs.current[currentPageIndex] && !isScrolling && isExplicitNavigation) {
      setIsScrolling(true);
      pageRefs.current[currentPageIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      const timer = setTimeout(() => {
        setIsScrolling(false);
        setIsExplicitNavigation(false); // Reset after scrolling
      }, 300);
      return () => clearTimeout(timer);
    } else {
      // Reset explicit navigation flag if no scrolling occurred
      setIsExplicitNavigation(false);
    }
  }, [currentPageIndex, isScrolling, isExplicitNavigation]);

  const handleDrop = (e, pageIndex = 0, dropIndex = null, sectionId = null, sectionSide = null) => {
    e.preventDefault();
    e.stopPropagation();
    const fieldType = e.dataTransfer.getData('fieldType');
    const fieldId = e.dataTransfer.getData('fieldId');

    // Check if a fieldset is being dropped
    const draggedFieldset = window.draggedFieldset;
    if (draggedFieldset) {
      const newFields = draggedFieldset.Fieldset_Fields__c.map((fieldsetField) => {
        const properties = JSON.parse(fieldsetField.Properties__c || "{}");
        return {
          ...properties,
          type : fieldsetField.Field_Type__c,
          id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate unique ID
        };
      });

      // Insert the new fields at the correct dropIndex
      if (dropIndex !== null) {
        console.log('Inserting fieldset at index:', dropIndex);
        console.log('New fields:', newFields);


        onDrop(null, pageIndex, dropIndex, null, sectionId, sectionSide, newFields);
      } else {
        onDrop(null, pageIndex, null, null, sectionId, sectionSide, newFields);
      }

      window.draggedFieldset = null; // Clear the dragged fieldset
      return;
    }

    if (fieldType && !fieldId) {
      onDrop(fieldType, pageIndex, dropIndex, null, sectionId, sectionSide);
    } else if (fieldId) {
      onDrop(null, pageIndex, dropIndex, fieldId, sectionId, sectionSide);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const deletePage = (pageIndex) => {
    // Call parent to remove the page
    onDeletePage(pageIndex);

    // Adjust currentPageIndex if needed
    setCurrentPageIndex(prev =>
      pageIndex < prev ? prev - 1 : Math.min(prev, pages.length - 2)
    );

    // Adjust pageWindowStart if needed
    const newPageCount = pages.length - 1;
    if (pageWindowStart > newPageCount - maxVisiblePages) {
      setPageWindowStart(Math.max(0, newPageCount - maxVisiblePages));
    }
  };

  const movePageUp = (pageIndex) => {
    if (pageIndex > 0 && onMovePageUp) {
      onMovePageUp(pageIndex);
      // If current page is moving up, follow it
      if (currentPageIndex === pageIndex) {
        setCurrentPageIndex(pageIndex - 1);
      }
      // If current page is the one being displaced, follow it down
      else if (currentPageIndex === pageIndex - 1) {
        setCurrentPageIndex(pageIndex);
      }
    }
  };

  const movePageDown = (pageIndex) => {
    if (pageIndex < pages.length - 1 && onMovePageDown) {
      onMovePageDown(pageIndex);
      // If current page is moving down, follow it
      if (currentPageIndex === pageIndex) {
        setCurrentPageIndex(pageIndex + 1);
      }
      // If current page is the one being displaced, follow it up
      else if (currentPageIndex === pageIndex + 1) {
        setCurrentPageIndex(pageIndex);
      }
    }
  };

  const handleFieldClick = (fieldId, sectionSide = null) => {
    const field = fields.find((field) => field.id === fieldId);
    // Don't auto-select divider, pagebreak, or section fields
    if (field && ['divider', 'pagebreak'].includes(field.type)) {
      return;
    }
    if (field?.type === 'section' && sectionSide === null) {
      return;
    }

    setSelectedFieldId(fieldId);
    setSelectedSectionSide(sectionSide);
    setSelectedFooter(null);
    const isSectionField = field && field.type === 'section';
    setShowSidebar(!isSectionField || sectionSide !== null);
  };

  const handleFooterClick = (pageIndex, buttonType) => {
    if (buttonType === 'previous' && pageIndex > 0) {
      setIsExplicitNavigation(true);
      setCurrentPageIndex(pageIndex - 1);
    } else if (buttonType === 'next' && pageIndex < pages.length - 1) {
      setIsExplicitNavigation(true);
      setCurrentPageIndex(pageIndex + 1);
    }
    setSelectedFooter({ pageIndex, buttonType });
    setSelectedFieldId(null);
    setSelectedSectionSide(null);
    setShowSidebar(false);
  };

  const handleDragStart = (e, index, pageIndex) => {
    const field = pages[pageIndex].fields[index];
    if (field.type === 'pagebreak') {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('fieldIndex', index.toString());
    e.dataTransfer.setData('pageIndex', pageIndex.toString());
    e.dataTransfer.setData('fieldId', field.id);
    e.dataTransfer.setData('fieldType', field.type);
    if (field.sectionId) {
      e.dataTransfer.setData('sectionId', field.sectionId);
      e.dataTransfer.setData('sectionSide', field.sectionSide);
    }
  };

  const handleDropReorder = (e, dropIndex, pageIndex) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedIndex = parseInt(e.dataTransfer.getData('fieldIndex'), 10);
    const draggedPageIndex = parseInt(e.dataTransfer.getData('pageIndex'), 10);
    const fieldId = e.dataTransfer.getData('fieldId');
    const fieldType = e.dataTransfer.getData('fieldType');
    const sectionId = e.dataTransfer.getData('sectionId');
    const sectionSide = e.dataTransfer.getData('sectionSide');

    if (isNaN(draggedIndex)) {
      if (fieldType && !fieldId) {
        onDrop(fieldType, pageIndex, dropIndex, null, sectionId, sectionSide);
      }
      return;
    }

    if (draggedPageIndex === pageIndex && draggedIndex === dropIndex && !sectionId) {
      return;
    }

    if (draggedPageIndex === pageIndex && onReorder && !sectionId) {
      onReorder(draggedIndex, dropIndex, pageIndex);
    } else if (onDrop) {
      onDrop(null, pageIndex, dropIndex, fieldId, sectionId, sectionSide);
    }
  };

  const handlePaste = (pageIndex, dropIndex, sectionId, sectionSide) => {
    if (!clipboard.field) return;

    const newFieldId = `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newField = {
      ...clipboard.field,
      id: newFieldId,
      isCut: false,
      sectionId: sectionId || null,
      sectionSide: sectionSide || null,
    };

    if (clipboard.operation === 'cut') {
      onDrop(null, pageIndex, dropIndex, clipboard.field.id, sectionId, sectionSide, newField);
      setClipboard({ field: null, operation: null });
    } else if (clipboard.operation === 'copy') {
      onDrop(null, pageIndex, dropIndex, null, sectionId, sectionSide, [newField]); 
    }
  };

  const handleScroll = () => {
    if (isScrolling) return;

    const container = fieldsContainerRef.current;
    if (!container) return;

    const containerTop = container.getBoundingClientRect().top;
    let newCurrentPage = 0;
    let minDistance = Infinity;

    pageRefs.current.forEach((pageEl, index) => {
      if (pageEl) {
        const pageTop = pageEl.getBoundingClientRect().top;
        const distance = Math.abs(pageTop - containerTop);

        if (distance < minDistance) {
          minDistance = distance;
          newCurrentPage = index;
        }
      }
    });

    if (newCurrentPage !== currentPageIndex) {
      setIsScrolling(true);
      setCurrentPageIndex(newCurrentPage);
      setTimeout(() => setIsScrolling(false), 300); // Debounce to prevent rapid changes
    }
  };

  return (
    <div className="builder-container">
      {/* Main content container with all pages */}
      <div
        className="all-page-container "
        ref={fieldsContainerRef}
        onScroll={handleScroll}
        style={{
          color: selectedTheme?.inputText ? undefined : undefined,
        }}
      >
        {pages.map((page, pageIndex) => (
          <React.Fragment key={pageIndex}>
            <div
              key={pageIndex}
              ref={el => pageRefs.current[pageIndex] = el}
              className="w-full mb-8 individual-page-card"
            >
              {/* Page Header */}
              <div className="flex justify-between items-center pt-4 pb-4 pr-1 pl-1">
                <span className="text-gray-500 text-sm font-medium">
                  Page {pageIndex + 1} of {pages.length}
                </span>
                <div className="flex items-center gap-2">
                  {/* Move Page Up Button */}
                  <button
                    onClick={() => movePageUp(pageIndex)}
                    disabled={pageIndex === 0 || pages.length <= 1}
                    className={`${pageIndex === 0 || pages.length <= 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100 rounded"}`}
                    title="Move page up"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M6 15L12 9L18 15" stroke="#5F6165" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {/* Move Page Down Button */}
                  <button
                    onClick={() => movePageDown(pageIndex)}
                    disabled={pageIndex === pages.length - 1 || pages.length <= 1}
                    className={`${pageIndex === pages.length - 1 || pages.length <= 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100 rounded"}`}
                    title="Move page down"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M18 9L12 15L6 9" stroke="#5F6165" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {/* Delete Button - Disabled when only one page exists */}
                  <button
                    onClick={() => pages.length > 1 && deletePage(pageIndex)}
                    title={pages.length <= 1 ? "Cannot delete the only page" : "Delete Page"}
                    disabled={pages.length <= 1}
                    className={pages.length <= 1 ? "opacity-50 cursor-not-allowed" : ""}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="16" height="20" viewBox="0 0 48 48">
                      <path d="M 24 4 C 20.491685 4 17.570396 6.6214322 17.080078 10 L 10.238281 10 A 1.50015 1.50015 0 0 0 9.9804688 9.9785156 A 1.50015 1.50015 0 0 0 9.7578125 10 L 6.5 10 A 1.50015 1.50015 0 1 0 6.5 13 L 8.6386719 13 L 11.15625 39.029297 C 11.427329 41.835926 13.811782 44 16.630859 44 L 31.367188 44 C 34.186411 44 36.570826 41.836168 36.841797 39.029297 L 39.361328 13 L 41.5 13 A 1.50015 1.50015 0 1 0 41.5 10 L 38.244141 10 A 1.50015 1.50015 0 0 0 37.763672 10 L 30.919922 10 C 30.429604 6.6214322 27.508315 4 24 4 z M 24 7 C 25.879156 7 27.420767 8.2681608 27.861328 10 L 20.138672 10 C 20.579233 8.2681608 22.120844 7 24 7 z M 11.650391 13 L 36.347656 13 L 33.855469 38.740234 C 33.730439 40.035363 32.667963 41 31.367188 41 L 16.630859 41 C 15.331937 41 14.267499 40.033606 14.142578 38.740234 L 11.650391 13 z M 20.476562 17.978516 A 1.50015 1.50015 0 0 0 19 19.5 L 19 34.5 A 1.50015 1.50015 0 1 0 22 34.5 L 22 19.5 A 1.50015 1.50015 0 0 0 20.476562 17.978516 z M 27.476562 17.978516 A 1.50015 1.50015 0 0 0 26 19.5 L 26 34.5 A 1.50015 1.50015 0 1 0 29 34.5 L 29 19.5 A 1.50015 1.50015 0 0 0 27.476562 17.978516 z"></path>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Page Content */}
              <main
                className={`${selectedTheme?.color || 'bg-white'} rounded-lg`}
                onDrop={(e) => handleDrop(e, pageIndex, page.fields.length)}
                onDragOver={handleDragOver}
              >
                <div
                  className={`w-full ${page.fields.length === 0
                    ? 'flex items-center justify-center'
                    : ''
                    }`}
                >
                  {page.fields.length === 0 ? (
                    <div className="w-1/2 h-[150px] bg-gray-100 border-dashed border-2 border-gray-300 rounded-lg flex items-center justify-center">
                      <p className="text-gray-500 text-center">
                        Drag and drop form elements here ({page.name})
                      </p>
                    </div>
                  ) : (
                    <div className="w-full flex flex-col">
                      {page.fields.map((field, index) => (
                        <div
                          key={field.id}
                          draggable={field.type !== 'pagebreak'}
                          onDragStart={(e) => handleDragStart(e, index, pageIndex)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDropReorder(e, index, pageIndex)}
                          className="mb-3"
                        >
                          <FormField
                            field={field}
                            isSelected={selectedFieldId === field.id && selectedSectionSide === field.sectionSide}
                            onClick={handleFieldClick}
                            onDrop={onDrop}
                            onUpdateField={onUpdateField}
                            onDeleteField={onDeleteField}
                            pageIndex={pageIndex}
                            sectionSide={field.sectionSide}
                            fields={fields}
                            setClipboard={setClipboard}
                            clipboard={clipboard}
                            handlePaste={() => handlePaste(pageIndex, index + 1, null, null)}
                            selectedTheme={selectedTheme}
                            selectedFieldId={selectedFieldId}
                            selectedSectionSide={selectedSectionSide}

                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </main>

              <footer
                className="flex justify-center gap-4 items-center p-4"
                onClick={() => {
                  setSelectedFooter({
                    pageIndex,
                    config: footerConfigs[pageIndex] || {}
                  });
                  setSelectedFieldId(null);
                  setSelectedSectionSide(null);
                  setShowSidebar(false);
                }}
              >
                {/* Buttons */}
                {pageIndex > 0 && (
                  <button
                    type="button"
                    style={{
                      background: footerConfigs[pageIndex]?.previous?.bgColor || "#6B7280",
                      color: footerConfigs[pageIndex]?.previous?.textColor || "#FFFFFF"
                    }}
                    className="px-6 py-2 rounded-lg hover:opacity-90"
                    onClick={e => {
                      e.stopPropagation();
                      handleFooterClick(pageIndex, 'previous');
                    }}
                  >
                    {footerConfigs[pageIndex]?.previous?.text || 'Previous'}
                  </button>
                )}
                {pageIndex < pages.length - 1 && (
                  <button
                    type="button"
                    style={{
                      background: footerConfigs[pageIndex]?.next?.bgColor || "#028AB0",
                      color: footerConfigs[pageIndex]?.next?.textColor || "#FFFFFF"
                    }}
                    className="px-6 py-2 rounded-lg hover:opacity-90"
                    onClick={e => {
                      e.stopPropagation();
                      handleFooterClick(pageIndex, 'next');
                    }}
                  >
                    {footerConfigs[pageIndex]?.next?.text || 'Next'}
                  </button>
                )}
                {pageIndex === pages.length - 1 && (
                  <button
                    type="button"
                    style={{
                      background: footerConfigs[pageIndex]?.submit?.bgColor || "#028AB0",
                      color: footerConfigs[pageIndex]?.submit?.textColor || "#FFFFFF"
                    }}
                    className="px-6 py-2 rounded-lg hover:opacity-90"
                    onClick={e => {
                      e.stopPropagation();
                      handleFooterClick(pageIndex, 'submit');
                    }}
                  >
                    {footerConfigs[pageIndex]?.submit?.text || 'Submit'}
                  </button>
                )}
              </footer>
            </div>
            {/* Add Page divider */}
            <div className="add-page-divider">
              <div className="add-page-line"></div>
              <div className="add-page-button-container">
                <button onClick={() => onAddPage(pageIndex)} className="add-page-button">
                  Add Page
                  <span className="add-page-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 5V19" stroke="rgba(92, 94, 97, 1)" stroke-width="2" stroke-linecap="round" />
                      <path d="M5 12H19" stroke="rgba(92, 94, 97, 1)" stroke-width="2" stroke-linecap="round" />
                    </svg>

                  </span>
                </button>
              </div>
              <div className="add-page-line"></div>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Page Navigation Footer */}
      <div
        className="bottom-bar"
        style={{
          width: `calc(75vw - ${isSidebarOpen ? '14.3rem' : '5.3rem'})`,
          left: isSidebarOpen ? '17.56rem' : '5.56rem'
        }}
      >
        <div className="page-nav flex items-center gap-2">
          {/* Slide Left */}
          <button
            onClick={() => setPageWindowStart(Math.max(0, pageWindowStart - 1))}
            disabled={pageWindowStart === 0}
            className="text-gray-500 hover:bg-gray-100 border rounded-md disabled:opacity-50"
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0.571429" y="0.571429" width="30.8571" height="30.8571" rx="3.42857" fill="white" />
              <rect x="0.571429" y="0.571429" width="30.8571" height="30.8571" rx="3.42857" />
              <path d="M18.2505 11.25L13.8605 15.74C13.8254 15.7736 13.7975 15.814 13.7784 15.8586C13.7593 15.9033 13.7495 15.9514 13.7495 16C13.7495 16.0486 13.7593 16.0967 13.7784 16.1414C13.7975 16.186 13.8254 16.2264 13.8605 16.26L18.2505 20.75" stroke="#000000" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </button>

          {/* Visible Page Buttons */}
          {pages
            .slice(pageWindowStart, pageWindowStart + maxVisiblePages)
            .map((page, index) => {
              const actualIndex = pageWindowStart + index;
              return (
                <button
                  key={actualIndex}
                  onClick={(e) => {
                    e.preventDefault();
                    setIsExplicitNavigation(true);
                    setIsScrolling(true);
                    setCurrentPageIndex(actualIndex);
                    if (pageRefs.current[actualIndex]) {
                      pageRefs.current[actualIndex].scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                      });
                    }
                    setTimeout(() => setIsScrolling(false), 300);
                  }}
                  className={`page-button ${currentPageIndex === actualIndex ? 'active' : ''}`}
                  title={page.name}
                >
                  Page {actualIndex + 1}
                </button>
              );
            })}

          {/* Slide Right */}
          <button
            onClick={() =>
              setPageWindowStart(prev =>
                Math.min(pages.length - maxVisiblePages, prev + 1)
              )
            }
            disabled={pageWindowStart + maxVisiblePages >= pages.length}
            className="border text-gray-500 hover:bg-gray-100 rounded-md disabled:opacity-50"
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0.571429" y="0.571429" width="30.8571" height="30.8571" rx="3.42857" fill="white" />
              <rect x="0.571429" y="0.571429" width="30.8571" height="30.8571" rx="3.42857" />
              <path d="M13.7495 11.25L18.1395 15.74C18.1746 15.7736 18.2025 15.814 18.2216 15.8586C18.2407 15.9033 18.2505 15.9514 18.2505 16C18.2505 16.0486 18.2407 16.0967 18.2216 16.1414C18.2025 16.186 18.1746 16.2264 18.1395 16.26L13.7495 20.75" stroke="#000000" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`rounded-md ${!canUndo ? 'text-gray-400' : 'text-gray-700 hover:bg-gray-100'}`}
            title="Undo"
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0.666667" y="0.666667" width="30.6667" height="30.6667" rx="3.33333" stroke="#F2F4F7" stroke-width="1.33333" />
              <path d="M15 23H18.75C20.1424 23 21.4777 22.4469 22.4623 21.4623C23.4469 20.4777 24 19.1424 24 17.75C24 16.3576 23.4469 15.0223 22.4623 14.0377C21.4777 13.0531 20.1424 12.5 18.75 12.5H9M11.5 9L8 12.5L11.5 16" stroke="#000000" stroke-width="1.5" stroke-linecap="round" />
            </svg>

          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`rounded-md ${!canRedo ? 'text-gray-400' : 'text-gray-700 hover:bg-gray-100'}`}
            title="Redo"
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="-0.666667" y="0.666667" width="30.6667" height="30.6667" rx="3.33333" transform="matrix(-1 0 0 1 30.6667 0)" stroke="#F2F4F7" stroke-width="1.33333" />
              <path d="M17 23H13.25C11.8576 23 10.5223 22.4469 9.53769 21.4623C8.55312 20.4777 8 19.1424 8 17.75C8 16.3576 8.55312 15.0223 9.53769 14.0377C10.5223 13.0531 11.8576 12.5 13.25 12.5H23M20.5 9L24 12.5L20.5 16" stroke="#000000" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </button>
        </div>
      </div>


    </div>
  );
}

export default FormBuilder;