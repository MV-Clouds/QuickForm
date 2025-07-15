import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Pill } from './Pill';
import { motion, AnimatePresence } from 'framer-motion';

export const ConditionInput = ({ control, appendCondition, removeCondition, conditionFields, formFields }) => {
  // Local form for condition input
  const { control: localControl, handleSubmit, reset } = useForm({
    defaultValues: {
      field: '',
      operator: '==',
      value: '',
    },
  });

  // Handle adding a new condition
  const onAddCondition = (data, e) => {
    e.preventDefault();
    if (data.field && data.value) {
      appendCondition({
        field: data.field,
        operator: data.operator,
        value: data.value,
      });
      reset(); // Clear the form after adding
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="border-b border-gray-200 pb-6 bg-white rounded-xl shadow-md p-6 mb-6"
    >
      <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <span>Conditions</span>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Advanced</span>
      </h3>
      {/* Condition Form */}
      <form onSubmit={handleSubmit(onAddCondition)} className="flex flex-wrap gap-4 items-end mb-6">
        {/* Field Selector */}
        <Controller
          name="field"
          control={localControl}
          render={({ field }) => (
            <div className="flex flex-col min-w-[180px]">
              <label className="text-xs font-semibold text-gray-600 mb-1">Field</label>
              <select
                {...field}
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-800 shadow-sm"
                value={field.value}
                onChange={e => field.onChange(e.target.value)}
              >
                <option value="">Select field</option>
                {formFields.map((formField) => (
                  <option key={formField.Id} value={formField.Id}>
                    {formField.Name}
                  </option>
                ))}
              </select>
            </div>
          )}
        />
        {/* Operator Selector */}
        <Controller
          name="operator"
          control={localControl}
          render={({ field }) => (
            <div className="flex flex-col min-w-[140px]">
              <label className="text-xs font-semibold text-gray-600 mb-1">Operator</label>
              <select
                {...field}
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-800 shadow-sm"
                value={field.value}
                onChange={e => field.onChange(e.target.value)}
              >
                <option value="==">equals</option>
                <option value="!=">does not equal</option>
                <option value="contains">contains</option>
              </select>
            </div>
          )}
        />
        {/* Value Input */}
        <Controller
          name="value"
          control={localControl}
          render={({ field }) => (
            <div className="flex flex-col min-w-[180px]">
              <label className="text-xs font-semibold text-gray-600 mb-1">Value</label>
              <input
                {...field}
                type="text"
                placeholder="Enter value"
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-800 shadow-sm"
              />
            </div>
          )}
        />
        {/* Add Button */}
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-lg font-semibold shadow hover:from-blue-600 hover:to-blue-800 transition-all"
        >
          Add Condition
        </motion.button>
      </form>
      {/* Condition List */}
      <AnimatePresence>
        <div className="flex flex-wrap gap-3 mt-2">
          {conditionFields.map((condition, index) => {
            // Find the field object for display
            const fieldObj = formFields.find(f => f.Id === condition.field);
            return (
              <motion.div
                key={condition.id || index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-2 shadow-sm"
              >
                <span className="font-semibold text-blue-800">
                  {fieldObj ? fieldObj.Name : condition.field}
                </span>
                <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                  {fieldObj ? fieldObj.Field_Type__c : ''}
                </span>
                <span className="text-gray-700">{condition.operator}</span>
                <span className="text-gray-900 font-medium">{condition.value}</span>
                <button
                  onClick={() => removeCondition(index)}
                  className="ml-2 text-red-500 hover:text-red-700 focus:outline-none"
                  title="Remove condition"
                >
                  ×
                </button>
              </motion.div>
            );
          })}
        </div>
      </AnimatePresence>
    </motion.div>
  );
};