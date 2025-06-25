import React, { useRef, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
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
}) {
  const fieldsContainerRef = useRef(null);

  // Organize fields into pages
  const headerField = fields.find((field) => field.type === 'header') || {
    id: 'default-header',
    type: 'header',
    heading: 'Form',
    alignment: 'center',
  };
  const nonHeaderFields = fields.filter((field) => field.id !== headerField.id);

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

  const handleDrop = (e, isHeaderDrop = false, pageIndex = 0, dropIndex = null, sectionId = null, sectionSide = null) => {
    e.preventDefault();
    e.stopPropagation();
    const fieldType = e.dataTransfer.getData('fieldType');
    const fieldId = e.dataTransfer.getData('fieldId');

    if (fieldType && !fieldId && !isHeaderDrop) {
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
    setShowSidebar(false);
  };

  const handleFooterClick = (pageIndex, buttonType) => {
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

    if (isNaN(draggedIndex) || isNaN(draggedPageIndex)) {
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        fieldsContainerRef.current &&
        !fieldsContainerRef.current.contains(event.target) &&
        !document.querySelector('.field-editor')?.contains(event.target)
      ) {
        setSelectedFieldId(null);
        setSelectedSectionSide(null);
        setSelectedFooter(null);
        setShowSidebar(true);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setShowSidebar, setSelectedFieldId, setSelectedSectionSide, setSelectedFooter]);

  const handleNext = (pageIndex) => {
    console.log(`Navigate to page ${pageIndex + 2}`);
  };

  const handlePrevious = (pageIndex) => {
    console.log(`Navigate to page ${pageIndex}`);
  };

  const handleSubmit = () => {
    console.log('Form submitted:', fields);
  };

  return (
    <div
      className={`relative max-h-[calc(100vh-0px)] overflow-y-auto [&::-webkit-scrollbar]:w-2 `}
      ref={fieldsContainerRef}
      style={{ color: selectedTheme?.inputText ? undefined : undefined }}
    >
      {pages.map((page, pageIndex) => (
        <div key={pageIndex}>
          <div className="relative group flex justify-center items-center mb-4 mx-auto opacity-75">
            <span className={`font-medium`}>{page.name}</span>
            {pages.length > 1 && (
              <button
                onClick={() => onDeletePage(pageIndex)}
                className="absolute right-0 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete Page"
              >
                <FaTimes size={12} />
              </button>
            )}
          </div>
          <main
            className={`mx-auto rounded-lg shadow-md flex flex-col mb-8 border border-gray-200 ${selectedTheme?.color || 'bg-white'}`}
            onDrop={(e) => handleDrop(e, false, pageIndex, page.fields.length)}
            onDragOver={handleDragOver}
          >
            {pageIndex === 0 && (
              <>
                <div className={`w-full flex items-center justify-center p-4 ${selectedTheme?.color || ''}`}>
                  <FormField
                    field={headerField}
                    isSelected={selectedFieldId === headerField.id}
                    onClick={handleFieldClick}
                    onDrop={onDrop}
                    onUpdateField={onUpdateField}
                    onDeleteField={onDeleteField}
                    pageIndex={pageIndex}
                    fields={fields}
                    setClipboard={setClipboard}
                    clipboard={clipboard}
                    handlePaste={() => handlePaste(pageIndex, 0, null, null)}
                    selectedTheme={selectedTheme}
                  />
                </div>
                <hr className="w-full border-gray-300 mb-4" />
              </>
            )}
            <div
              className={`p-4 w-full ${page.fields.length === 0 ? 'flex items-center justify-center' : ''}`}
            >
              {page.fields.length === 0 ? (
                <div className="w-1/2 h-[150px] bg-gray-100 border-dashed border-2 border-gray-300 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500 text-center">Drag and drop form elements here ({page.name})</p>
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
            <hr className="border-gray-300 mt-4 mb-4" />
            <footer className="flex justify-center gap-4 items-center p-4">
              {pageIndex > 0 && (
                <button
                  type="button"
                  className={`px-6 py-2 rounded-lg ${selectedTheme?.buttonBg || 'bg-gray-600'} ${selectedTheme?.buttonText || 'text-white'} hover:opacity-90`}
                  onClick={() => {
                    handlePrevious(pageIndex);
                    handleFooterClick(pageIndex, 'previous');
                  }}
                >
                  Previous
                </button>
              )}
              {pageIndex < pages.length - 1 && (
                <button
                  type="button"
                  className={`px-6 py-2 rounded-lg ${selectedTheme?.buttonBg || 'bg-blue-600'} ${selectedTheme?.buttonText || 'text-white'} hover:opacity-90`}
                  onClick={() => {
                    handleNext(pageIndex);
                    handleFooterClick(pageIndex, 'next');
                  }}
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
          </main>
        </div>
      ))}
    </div>
  );
}

export default FormBuilder;
