import React, { useMemo, useState } from 'react';
import { useSalesforceData } from '../Context/MetadataContext';
const DeletedFormsPage = () => {
    const {deletedData , isLoading} = useSalesforceData();
  const [search, setSearch] = useState('');
    console.log('Deleted data ==>' , deletedData)
  const filteredDeletedForms = useMemo(() => 
    deletedData.filter(f => 
      f.Name.toLowerCase().includes(search.toLowerCase())
    ), 
  [deletedData, search]);

  const renderFieldPreview = (fields = []) => (
    <div
      className="overflow-y-auto rounded-lg"
      style={{
        minHeight: 150,
        maxHeight: 150,
        scrollbarWidth: 'none',
        background: 'white',
        filter: 'brightness(0.7)',
      }}
    >
      {fields.length === 0 ? (
        <div className="text-gray-400 text-xs text-center py-4">No fields</div>
      ) : (
        fields.slice(0, 4).map((f, i) => (
          <div
            key={i}
            className="flex flex-col gap-1 bg-gray-50 rounded-md px-2 py-1 border border-gray-100"
          >
            <label className="text-xs font-semibold text-gray-700 truncate">
              {f.Name || f.label || 'Field'}
            </label>
            <input
              type="text"
              className="w-full rounded border border-gray-200 px-2 py-1 text-xs bg-white"
              placeholder={f.placeholder?.main || f.Name || 'Field'}
              disabled
            />
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="w-[95%] mt-4 mx-auto px-8 py-6 shadow-lg rounded-lg">
      <div className="items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Deleted Forms</h1>
        <div className="flex items-center gap-4 flex-1 justify-between mt-2">
          <input
            type="text"
            placeholder="Search deleted forms..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-black-400 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all shadow-sm w-64"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow p-4 border border-gray-200 animate-pulse h-[260px]">
              <div className="h-24 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-300 rounded w-1/2"></div>
            </div>
          ))
        ) : (
          <>
            {filteredDeletedForms.length === 0 && (
              <div className="col-span-4 text-gray-400 text-center py-12">
                No deleted forms found.
              </div>
            )}
            {filteredDeletedForms.map((form, idx) => {
              let fields = [];
              try {
                fields = form.FormVersions[0].Fields || [];
              } catch {
                fields = [];
              }

              return (
                <div
                  key={form.Id || idx}
                  className="flex flex-col items-center bg-white rounded-xl shadow p-4 hover:shadow-lg transition-all border border-red-100 h-[260px]"
                >
                  <div className="w-full flex-1 flex flex-col justify-center">
                    {renderFieldPreview(fields)}
                  </div>
                  <div className="mt-2 text-center font-bold text-lg truncate max-w-[180px]">
                    {form.FormVersions[0]?.Name}
                  </div>
                  <div className="text-gray-500 text-center">
                    {form.Description}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};

export default DeletedFormsPage;
