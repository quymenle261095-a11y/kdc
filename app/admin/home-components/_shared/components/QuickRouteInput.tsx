import React, { useState } from 'react';
import { Input, Button, cn } from '@/app/admin/components/ui';
import { QuickRoutePickerModal } from '@/app/admin/components/QuickRoutePickerModal';

interface QuickRouteInputProps extends React.ComponentProps<typeof Input> {
  value: string;
  onChangeValue: (value: string) => void;
  inputClassName?: string;
}

export function QuickRouteInput({ 
  value, 
  onChangeValue, 
  className, 
  inputClassName,
  placeholder = "Vd: /dien-thoai-phu-kien",
  ...rest 
}: QuickRouteInputProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      <div className={cn("flex gap-1", className)}>
        <Input 
          {...rest}
          placeholder={placeholder} 
          className={cn("h-8 text-xs flex-1 min-w-0", inputClassName)} 
          value={value ?? ''} 
          onChange={(e) => onChangeValue(e.target.value)} 
        />
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={() => setPickerOpen(true)} 
          className="h-8 px-2 shrink-0 text-xs text-blue-600"
        >
          Gợi ý
        </Button>
      </div>
      {pickerOpen && (
        <QuickRoutePickerModal
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onSelect={(option) => {
            onChangeValue(option.url);
            setPickerOpen(false);
          }}
        />
      )}
    </>
  );
}
