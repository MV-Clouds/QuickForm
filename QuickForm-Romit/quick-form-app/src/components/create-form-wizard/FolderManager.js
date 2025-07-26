import React, { useState, useMemo } from 'react';
import { PlusCircle } from 'lucide-react';

const FOLDER_ICON = (
    <svg width="57" height="46" viewBox="0 0 57 46" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M21.5923 1.85536C20.8579 0.876107 19.7052 0.299805 18.4812 0.299805H4.63889C2.49112 0.299805 0.75 2.04091 0.75 4.18869V41.8163C0.75 43.964 2.49112 45.7052 4.63889 45.7052H52.8611C55.0089 45.7052 56.75 43.964 56.75 41.8163V13.2698C56.75 11.1221 55.0089 9.38089 52.8611 9.38089H29.1809C27.9568 9.38089 26.8043 8.80457 26.0698 7.82533L21.5923 1.85536Z" fill="url(#paint0_linear_1568_12948)" />
        <defs>
            <linearGradient id="paint0_linear_1568_12948" x1="28.75" y1="0.299805" x2="28.75" y2="45.7052" gradientUnits="userSpaceOnUse">
                <stop stop-color="#FFDC78" />
                <stop offset="1" stop-color="#FBBC1A" />
            </linearGradient>
        </defs>
    </svg>

);

const FOLDERS_PER_PAGE = 16;

const FolderManager = ({ recentForms = [], handleCreateFolder }) => {
    // Extract unique folders and counts
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [selectedFormIds, setSelectedFormIds] = useState([]);
    const [page, setPage] = useState(0);
    console.log('forms ==>' , recentForms)
    // All folders: { name, count }
    const folders = useMemo(() => {
        const folderMap = {};
        // Sort recentForms by LastModifiedDate in descending order before processing
        recentForms.forEach(f => {
            if (f.Folder__c) {
                f.Folder__c.split('<>').map(name => name.trim()).filter(Boolean).forEach(folder => {
                    if (!folderMap[folder]) folderMap[folder] = 0;
                    folderMap[folder]++;
                });
            }
        });
        return Object.entries(folderMap).map(([name, count]) => ({ name, count }));
    }, [recentForms]);

    // Filtered folders
    const filteredFolders = useMemo(() =>
        folders.filter(f => f.name.toLowerCase().includes(search.toLowerCase())),
        [folders, search]
    );

    // Paginated folders
    const paginatedFolders = useMemo(() =>
        filteredFolders.slice(page * FOLDERS_PER_PAGE, (page + 1) * FOLDERS_PER_PAGE),
        [filteredFolders, page]
    );
    // All forms for modal
    const allForms = useMemo(() =>
        recentForms.map(f => ({
            id: f.id || f.Id,
            name: f.FormVersions.filter((version) => version.Stage__c === 'Publish')[0]?.Name  || (f.FormVersions[0]?.Name) || 'Form',
            folder: f.Folder__c,
        })),
        [recentForms]
    );

    // Modal logic
    const handleFormCheckbox = (id) => {
        setSelectedFormIds(prev => prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]);
    };
    const handleModalSave = () => {
        if (newFolderName.trim()) {
            handleCreateFolder(newFolderName.trim(), selectedFormIds);
            setModalOpen(false);
            setNewFolderName('');
            setSelectedFormIds([]);
        }
    };

    // Pagination logic
    const totalPages = Math.ceil(filteredFolders.length / FOLDERS_PER_PAGE);

    return (
        <div className="mt-6 px-8">
            <h2 className="text-3xl font-bold mb-6 text-gray-900">Folders</h2>
            <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
                <input
                    type="text"
                    placeholder="Search folders..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-black-400 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all shadow-sm w-64"
                />
                <button
                    className="flex items-center gap-2 rounded-lg px-5 py-2 text-white font-semibold shadow-md"
                    style={{ background: 'linear-gradient(to right, #0B295E, #1D6D9E)' }}
                    onClick={() => setModalOpen(true)}
                >
                    <PlusCircle className="h-5 w-5" /> Create Folder
                </button>
            </div>
            {/* Folders Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {paginatedFolders.length === 0 && (
                    <div className="col-span-4 text-gray-400 text-center py-12">No folders found.</div>
                )}
                {paginatedFolders.map((folder, idx) => (
                    <div key={folder.name} className="flex  items-center bg-white rounded-xl shadow p-6 hover:shadow-lg transition-all border border-yellow-100">
                        <div className="mb-3 ">{FOLDER_ICON}</div>
                        <div className='ml-2'>
                            <div className="font-bold text-lg  mb-1 truncate max-w-[150px]">{folder.name}</div>
                            <div className="text-sm text-gray-500 flex">
                                {/* <div>
                                <svg width="5" height="4" viewBox="0 0 5 4" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="2.75" cy="2" r="2" fill="#5F6165" />
                                </svg>
                            </div> */}
                                <div>{folder.count} item{folder.count > 1 ? 's' : ''}</div></div>
                        </div>
                    </div>
                ))}
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center mt-8 gap-2">
                    {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                            key={i}
                            className={`rounded-full w-8 h-8 flex items-center justify-center font-bold ${i === page ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-blue-100'}`}
                            onClick={() => setPage(i)}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>
            )}
            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
                    <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-lg relative">
                        <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-700" onClick={() => setModalOpen(false)}>&times;</button>
                        <h3 className="text-xl font-bold mb-4">Create Folder</h3>
                        <input
                            type="text"
                            placeholder="Folder name"
                            value={newFolderName}
                            onChange={e => setNewFolderName(e.target.value)}
                            className="w-full mb-4 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                        <div className="mb-4 max-h-48 overflow-y-auto">
                            <div className="font-semibold mb-2 text-gray-700">Add forms to this folder:</div>
                            {allForms.map(form => (
                                <label key={form.id} className="flex items-center gap-2 mb-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedFormIds.includes(form.id)}
                                        onChange={() => handleFormCheckbox(form.id)}
                                        className="accent-blue-600"
                                    />
                                    <span className="truncate text-gray-800">{form.name}</span>
                                </label>
                            ))}
                        </div>
                        <button
                            className="w-full py-2 rounded-lg font-semibold text-white mt-2"
                            style={{ background: 'linear-gradient(to right, #0B295E, #1D6D9E)' }}
                            onClick={handleModalSave}
                            disabled={!newFolderName.trim()}
                        >
                            Save Folder
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FolderManager; 