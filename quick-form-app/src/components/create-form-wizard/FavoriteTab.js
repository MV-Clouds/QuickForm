import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button,  Row, Col, Tooltip, DatePicker, Select } from "antd";
import { SearchOutlined, FilterOutlined, EyeOutlined, CloseOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import Loader from '../Loader'
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(isBetween);

const { RangePicker } = DatePicker;
const { Option } = Select;

const FavoriteTab = ({ handleEditForm, loading, favoriteData }) => {
  const [search, setSearch] = useState("");
  const [filterVisible, setFilterVisible] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  // filter states
  const [stageFilter, setStageFilter] = useState(null);
  const [versionFilter, setVersionFilter] = useState(null);
  const [dateRange, setDateRange] = useState(null);

  const filteredFavorites = useMemo(() => {
    return favoriteData.filter((f) => {
      const matchesSearch = f.Name.toLowerCase().includes(search.toLowerCase());

      const selectedVersion =
        f.FormVersions?.find(
          (v) => v.Version__c === f.Active_Version__c?.split("")[1]
        ) || f.FormVersions?.[0];

      if (!selectedVersion) return false;

      const matchesStage =
        !stageFilter || selectedVersion.Stage__c === stageFilter;

      const matchesVersion =
        !versionFilter || f.Active_Version__c === versionFilter;

      const matchesDate =
        !dateRange ||
        (f.LastModifiedDate &&
          dayjs(f.LastModifiedDate).isBetween(dateRange[0], dateRange[1], null, "[]"));

      return matchesSearch && matchesStage && matchesVersion && matchesDate;
    });
  }, [favoriteData, search, stageFilter, versionFilter, dateRange]);

  const handleViewForm = (formId) => {
    handleEditForm(favoriteData.find((val) => val.Id === formId));
  };
  const uniqueVersions = [...new Set(favoriteData.map((f) => f.Active_Version__c))];

  const toggleStatus = (formId) => {
    // Implement status toggle logic here
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="">
      {/* Starred Section Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="gradient-bg mb-8 py-6 px-6 flex items-center justify-between"
      >
        <h1 className="text-white font-bold text-3xl m-0">
          ⭐ Starred
        </h1>
      </motion.div>

      {/* Search & Filter Row */}
      <div className="flex justify-between items-center mb-8 mx-4">
        <div className="relative w-80">
          <SearchOutlined className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600 z-10" />
          <input
            type="text"
            size="large"
            placeholder="Search fieldsets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:border-blue-500 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          )}
        </div>
        <div>
             <Button
                icon={<FilterOutlined />}
                className="login-button"
                onClick={() => setFilterVisible(!filterVisible)}
                >
                Filter
               </Button>
        </div>
       
      </div>
      {/* Sliding Filter Panel */}
      <AnimatePresence>
        {filterVisible && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3 }}
            className="fixed top-[18%] right-0 w-80 h-[50%] bg-white shadow-2xl z-50 p-6 flex flex-col"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Filters</h2>
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={() => setFilterVisible(false)}
              />
            </div>

            <div className="space-y-6 flex-grow">
              {/* Stage Filter */}
              <div>
                <label className="block text-sm font-medium mb-1">Stage</label>
                <Select
                  placeholder="Select stage"
                  value={stageFilter}
                  onChange={setStageFilter}
                  allowClear
                  className="w-full"
                >
                  <Option value="Publish">Active</Option>
                  <Option value="Draft">Draft</Option>
                </Select>
              </div>

              {/* Version Filter */}
              <div>
                <label className="block text-sm font-medium mb-1">Version</label>
                <Select
                  placeholder="Select version"
                  value={versionFilter}
                  onChange={setVersionFilter}
                  allowClear
                  className="w-full"
                >
                  {uniqueVersions.map((ver) => (
                    <Option key={ver} value={ver}>
                      {ver}
                    </Option>
                  ))}
                </Select>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium mb-1">Last Modified</label>
                <RangePicker
                  className="w-full"
                  value={dateRange}
                  onChange={(dates) => setDateRange(dates)}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between mt-6">
              <Button
                onClick={() => {
                  setStageFilter(null);
                  setVersionFilter(null);
                  setDateRange(null);
                }}
              >
                Clear All
              </Button>
              <Button type="primary" onClick={() => setFilterVisible(false)}>
                Apply
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      {loading ? (
        <motion.div
          key="card-view"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 relative h-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          >
            <div style={{ width: '80vw', height:'70vh' }}> <Loader text={"Loading Favorites"} fullScreen={false} /></div>
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            layout
            className="w-full px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Row gutter={[24, 24]} justify="start">
              {filteredFavorites.length ? (
                 filteredFavorites.map((item) => {
                  const selectedVersion =
                    item.FormVersions?.find(
                      (version) =>
                        version.Version__c === item.Active_Version__c.split('')[1]
                    ) || item.FormVersions?.[0];
                  console.log(selectedVersion);
                  if (!selectedVersion) {
                    return null; // Skip rendering if no versions are found
                  }

                  return(
                  <Col
                    xs={24}
                    sm={12}
                    md={8}
                    lg={6}
                    key={item.Id}
                  >
                    <motion.div
                      layout
                      whileHover={{ y: -4 }}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                      className="h-full"
                      onMouseEnter={() => setHoveredCard(item.Id)}
                      onMouseLeave={() => setHoveredCard(null)}
                    >
                      <div
                        className="bg-white shadow-md h-full flex flex-col overflow-hidden"
                        style={{
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                        }}
                      >
                        {/* Card Header with Title */}
                        <div
                          className="bg-gradient-to-r from-blue-900 to-blue-700 text-white py-4 px-4 relative"
                        >
                          <h3 className="text-lg font-semibold text-center m-0 truncate">
                            {selectedVersion.Name || "Form Title"}
                          </h3>
                          
                          {/* Status badge that appears on hover */}
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ 
                              opacity: hoveredCard === item.Id ? 1 : 0,
                              y: hoveredCard === item.Id ? 0 : -10
                            }}
                            transition={{ duration: 0.2 }}
                            className="absolute top-2 right-2"
                          >
                            <span
                              className={`px-2 py-1 text-xs font-medium ${
                                selectedVersion.Stage__c === "Publish"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {selectedVersion.Stage__c}
                            </span>
                          </motion.div>
                        </div>

                        {/* Card Content */}
                        <div className="p-4 flex-grow flex flex-col">
                          {/* Fields Preview */}
                          <div
                            className="flex-grow overflow-y-auto mb-4"
                            style={{ maxHeight: "135px" }}
                          >
                            {Array.isArray(selectedVersion.Fields) && selectedVersion.Fields.filter(
                                    (field) =>
                                      !['footer', 'submit', 'header.length'].includes(
                                        (field.Field_Type__c || '').toLowerCase()
                                      ) && !field.isHiddden__c
                                  ).length > 0
                              ? selectedVersion.Fields
                                  .sort(
                                    (a, b) =>
                                      (a.Order_Number__c || 0) -
                                      (b.Order_Number__c || 0)
                                  ).filter(
                                    (field) =>
                                      !['footer', 'submit', 'header'].includes(
                                        (field.Field_Type__c || '').toLowerCase()
                                      ) && !field.isHiddden__c
                                  )
                                  .map((field) => (
                                    <Tooltip title={field.Name} key={field.Id}>
                                      <div key={field.Id}
                                        className="bg-gray-50 py-2 px-3 mb-2 flex items-center justify-between border border-gray-200"
                                      >
                                        <span
                                          className="text-blue-700 font-medium text-sm truncate mr-2"
                                        >
                                          {field.Name}
                                        </span>
                                        <div className="w-20">
                                          {(() => {
                                            switch (
                                              (field.Field_Type__c || "").toLowerCase()
                                            ) {
                                              case "number":
                                                return (
                                                  <input
                                                    type="number"
                                                    disabled
                                                    placeholder="0"
                                                    className="w-full p-1 text-sm border border-gray-300"
                                                  />
                                                );
                                              case "textarea":
                                                return (
                                                  <textarea
                                                    rows={1}
                                                    disabled
                                                    placeholder="Text"
                                                    className="w-full p-1 text-sm border border-gray-300"
                                                  />
                                                );
                                              case "date":
                                                return (
                                                  <input
                                                    type="date"
                                                    disabled
                                                    className="w-full p-1 text-sm border border-gray-300"
                                                  />
                                                );
                                              case "checkbox":
                                                return <input type="checkbox" disabled className="scale-75" />;
                                              case "dropdown":
                                                return (
                                                  <select
                                                    disabled
                                                    className="w-full p-1 text-sm border border-gray-300 bg-gray-100"
                                                  >
                                                    <option>Select</option>
                                                  </select>
                                                );
                                              default:
                                                return (
                                                  <input
                                                    type="text"
                                                    disabled
                                                    placeholder="Text"
                                                    className="w-full p-1 text-sm border border-gray-300"
                                                  />
                                                );
                                            }
                                          })()}
                                        </div>
                                      </div>
                                    </Tooltip>
                                  ))
                              : (
                                <div
                                  className="text-center text-gray-400 py-8"
                                >
                                  No fields to preview.
                                </div>
                              )}
                          </div>

                          {/* Metadata */}
                          <div className="space-y-2 text-sm text-gray-600 mb-4">
                            <div className="flex justify-between">
                              <span>Version:</span>
                              <span className="font-medium">
                                {item.Active_Version__c || "V1"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Last Modified:</span>
                              <span className="font-medium">
                                {formatDate(item.LastModifiedDate) || "N/A"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Submissions:</span>
                              <span className="font-medium">
                                {selectedVersion.Submission_Count__c || 0}
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="mt-auto">
                            <Button
                              icon={<EyeOutlined />}
                              className="login-button w-full"
                              onClick={() => handleViewForm(item.Id)}
                            >
                              View Form
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </Col>
                )}
              )
              ) : (
                <Col span={24}>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-gray-400 py-10"
                  >
                    No starred fieldsets found.
                  </motion.div>
                </Col>
              )}
            </Row>
          </motion.div>
        </AnimatePresence>
      )}

      <style jsx>{`
        .gradient-bg {
          background: linear-gradient(to right, #008AB0, #8FDCF1);
        }
        
       
      `}</style>
    </div>
  );
};

export default FavoriteTab;