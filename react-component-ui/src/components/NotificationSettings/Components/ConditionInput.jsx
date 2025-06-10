'use client'

import React, { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { Pill } from './Pill'

export const ConditionInput = ({ control, appendCondition, removeCondition, conditionFields, formFields }) => {
  const [showConditionInput, setShowConditionInput] = useState(false)

  // Local form for condition input
  const { control: localControl, handleSubmit, reset } = useForm({
    defaultValues: {
      field: '',
      operator: '==',
      value: '',
    },
  })

  const onAddCondition = (data) => {
    data.preventDefault();
    if (data.field && data.value) {
      
      appendCondition({
        field: data.field,
        operator: data.operator,
        value: data.value,
      })
      reset() // Clear the form after adding
    }
  }

  return (
    <div className="border-b border-border pb-6">
      <h3 className="text-lg font-semibold text-foreground tracking-tight mb-4">Conditions (Optional)</h3>
      <button
        type="button"
        className="px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 shadow-sm flex items-center gap-2"
        onClick={() => setShowConditionInput(true)}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
        </svg>
        Add Condition
      </button>
      {showConditionInput && (
        <form onSubmit={handleSubmit(onAddCondition)} className="flex flex-wrap gap-3 mt-4 mb-4">
          <Controller
            name="field"
            control={localControl}
            render={({ field }) => (
              <select
                {...field}
                className="p-2.5 border border-border rounded-lg focus:ring-primary focus:border-primary bg-card text-foreground placeholder-muted-foreground min-w-[150px]"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
              >
                <option value="">Select field</option>
                {formFields.map((formField) => (
                  <option key={formField.id} value={formField.id}>
                    {formField.label}
                  </option>
                ))}
              </select>
            )}
          />
          <Controller
            name="operator"
            control={localControl}
            render={({ field }) => (
              <select
                {...field}
                className="p-2.5 border border-border rounded-lg focus:ring-primary focus:border-primary bg-card text-foreground min-w-[120px]"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
              >
                <option value="==">equals</option>
                <option value="!=">does not equal</option>
                <option value="contains">contains</option>
              </select>
            )}
          />
          <Controller
            name="value"
            control={localControl}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                placeholder="Value"
                className="p-2.5 border border-border rounded-lg focus:ring-primary focus:border-primary bg-card text-foreground placeholder-muted-foreground min-w-[150px]"
              />
            )}
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-gradient-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200 shadow-sm"

          >
            Add Condition
          </button>
        </form>
      )}
      <div className="flex flex-wrap gap-2">
        {conditionFields.map((condition, index) => (
          <Pill
            key={condition.id}
            value={`${condition.field} ${condition.operator} ${condition.value}`}
            onRemove={() => removeCondition(index)}
          />
        ))}
      </div>
    </div>
  )
}