import React, { useRef, useEffect, useState } from 'react';
import { MdUndo, MdRedo } from 'react-icons/md';
import FormField from './FormField';

function FormBuilder({
  fields,
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
}) {
  const fieldsContainerRef = useRef(null);
  const pageRefs = useRef([]);
  const [isScrolling, setIsScrolling] = useState(false);

  // Organize fields into pages
  const nonHeaderFields = fields.filter((field) => field.type !== 'header');

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

  // Scroll to current page when currentPageIndex changes
  useEffect(() => {
  if (pageRefs.current[currentPageIndex] && !isScrolling) {
    setIsScrolling(true);
    pageRefs.current[currentPageIndex].scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
    const timer = setTimeout(() => setIsScrolling(false), 300);
    return () => clearTimeout(timer);
  }
}, [currentPageIndex, isScrolling]);

  const handleDrop = (e, pageIndex = 0, dropIndex = null, sectionId = null, sectionSide = null) => {
    e.preventDefault();
    e.stopPropagation();
    const fieldType = e.dataTransfer.getData('fieldType');
    const fieldId = e.dataTransfer.getData('fieldId');

    if (fieldType && !fieldId) {
      onDrop(fieldType, pageIndex, dropIndex, null, sectionId, sectionSide);
    } else if (fieldId) {
      onDrop(null, pageIndex, dropIndex, fieldId, sectionId, sectionSide);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleFieldClick = (fieldId, sectionSide = null) => {
    setSelectedFieldId(fieldId);
    setSelectedSectionSide(sectionSide);
    setSelectedFooter(null);
    const isSectionField = fields.find((field) => field.id === fieldId && field.type === 'section');
    setShowSidebar(!isSectionField || sectionSide !== null);
  };

  const handleFooterClick = (pageIndex, buttonType) => {
    if (buttonType === 'previous' && pageIndex > 0) {
      setCurrentPageIndex(pageIndex - 1);
    } else if (buttonType === 'next' && pageIndex < pages.length - 1) {
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
      onDrop(null, pageIndex, dropIndex, null, sectionId, sectionSide, newField);
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

  const handleSubmit = () => {
    console.log('Form submitted:', fields);
  };

  return (
    <div className="builder-container">
      {/* Page Navigation Footer */}
<div className="bottom-bar">
  {pages.map((page, index) => (
    <button
      key={index}
      onClick={(e) => {
        e.preventDefault();
        setIsScrolling(true);
        setCurrentPageIndex(index);
        if (pageRefs.current[index]) {
          pageRefs.current[index].scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
        setTimeout(() => setIsScrolling(false), 300);
      }}
      className={`px-3 py-1 rounded-md text-sm ${
        currentPageIndex === index
          ? 'bg-blue-100 text-blue-600 font-medium'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
      title={page.name}
    >
      Page {index + 1}
    </button>
  ))}
  <button 
    onClick={onAddPage} 
    className="px-2 py-1 text-gray-500 hover:bg-gray-100 rounded-md" 
    title="Add Page"
  >
    +
  </button>
</div>
      {/* Main content container with all pages */}
      <div 
        className="builder-subheader pb-16" 
        ref={fieldsContainerRef}
        onScroll={handleScroll}
        style={{ 
          color: selectedTheme?.inputText ? undefined : undefined,
          overflowY: 'auto',
          height: 'calc(100vh - 150px)' // Adjust based on your layout
        }}
      >
        {pages.map((page, pageIndex) => (
          <React.Fragment key={pageIndex}>
            <div 
              key={pageIndex} 
              ref={el => pageRefs.current[pageIndex] = el}
              className="w-full mb-8 individual-page"
            >
              {/* Page Header */}
              <div className="flex justify-between items-center pt-4 pb-4 pr-1 pl-1">
                <span className="text-gray-500 text-sm font-medium">
                  Page {pageIndex + 1} of {pages.length}
                </span>
                <div className="flex items-center gap-2">
                  {/* Up Icon (not clickable) */}
                  <span>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path d="M18 9L12 15L6 9" stroke="#5F6165" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                  </span>
                  {/* Down Icon (not clickable) */}
                  <span>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path d="M6 15L12 9L18 15" stroke="#5F6165" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                  </span>
                  {pages.length > 1 && (
                    <button
                      onClick={() => onDeletePage(pageIndex)}
                      title="Delete Page"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="16" height="20" viewBox="0 0 48 48">
                        <path d="M 24 4 C 20.491685 4 17.570396 6.6214322 17.080078 10 L 10.238281 10 A 1.50015 1.50015 0 0 0 9.9804688 9.9785156 A 1.50015 1.50015 0 0 0 9.7578125 10 L 6.5 10 A 1.50015 1.50015 0 1 0 6.5 13 L 8.6386719 13 L 11.15625 39.029297 C 11.427329 41.835926 13.811782 44 16.630859 44 L 31.367188 44 C 34.186411 44 36.570826 41.836168 36.841797 39.029297 L 39.361328 13 L 41.5 13 A 1.50015 1.50015 0 1 0 41.5 10 L 38.244141 10 A 1.50015 1.50015 0 0 0 37.763672 10 L 30.919922 10 C 30.429604 6.6214322 27.508315 4 24 4 z M 24 7 C 25.879156 7 27.420767 8.2681608 27.861328 10 L 20.138672 10 C 20.579233 8.2681608 22.120844 7 24 7 z M 11.650391 13 L 36.347656 13 L 33.855469 38.740234 C 33.730439 40.035363 32.667963 41 31.367188 41 L 16.630859 41 C 15.331937 41 14.267499 40.033606 14.142578 38.740234 L 11.650391 13 z M 20.476562 17.978516 A 1.50015 1.50015 0 0 0 19 19.5 L 19 34.5 A 1.50015 1.50015 0 1 0 22 34.5 L 22 19.5 A 1.50015 1.50015 0 0 0 20.476562 17.978516 z M 27.476562 17.978516 A 1.50015 1.50015 0 0 0 26 19.5 L 26 34.5 A 1.50015 1.50015 0 1 0 29 34.5 L 29 19.5 A 1.50015 1.50015 0 0 0 27.476562 17.978516 z"></path>
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Page Content */}
              <main
                  className={`${selectedTheme?.color || 'bg-white'} rounded-lg`}
                  onDrop={(e) => handleDrop(e, pageIndex, page.fields.length)}
                  onDragOver={handleDragOver}
              >
                <div
                  className={`w-full ${
                    page.fields.length === 0
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
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </main>

              {/* Navigation buttons for each page */}
              <footer className="flex justify-center gap-4 items-center p-4">
                {pageIndex > 0 && (
                  <button
                    type="button"
                    className={`px-6 py-2 rounded-lg ${selectedTheme?.buttonBg || 'bg-gray-600'} ${selectedTheme?.buttonText || 'text-white'} hover:opacity-90`}
                    onClick={() => handleFooterClick(pageIndex, 'previous')}
                  >
                    Previous
                  </button>
                )}
                {pageIndex < pages.length - 1 && (
                  <button
                    type="button"
                    className={`px-6 py-2 rounded-lg ${selectedTheme?.buttonBg || 'bg-blue-600'} ${selectedTheme?.buttonText || 'text-white'} hover:opacity-90`}
                    onClick={() => handleFooterClick(pageIndex, 'next')}
                  >
                    Next
                  </button>
                )}
                {pageIndex === pages.length - 1 && (
                  <button
                    type="button"
                    className={`px-6 py-2 rounded-lg ${selectedTheme?.buttonBg || 'bg-blue-600'} ${selectedTheme?.buttonText || 'text-white'} hover:opacity-90`}
                    onClick={() => {
                      handleSubmit();
                      handleFooterClick(pageIndex, 'submit');
                    }}
                  >
                    Submit
                  </button>
                )}
              </footer>
            </div>
            {/* Add Page divider */}
            <div className="add-page-divider">
              <div className="add-page-line"></div>
              <div className="add-page-button-container">
                <button onClick={onAddPage} className="add-page-button">
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
    </div>
  );
}

export default FormBuilder;