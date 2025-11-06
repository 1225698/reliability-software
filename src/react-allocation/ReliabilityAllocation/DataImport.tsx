import React, { useRef } from 'react';
import * as XLSX from 'xlsx';

interface DataImportProps {
  label?: string;
  templateType: 'system' | 'unit';
  onData: (rows: Record<string, any>[]) => void;
  small?: boolean;
}

const templates: Record<string, string[][]> = {
  system: [ ['系统名称', '预计故障率(1/h)'], ['感知系统', '0.000137719'], ['传输系统', '0.000013'] ],
  unit: [ ['单元名称', '数量', '预计故障率'], ['通讯浮标舱', '1', '0.000009979'] ],
};

export const DataImport: React.FC<DataImportProps> = ({ label = '导入Excel', templateType, onData, small }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const first = workbook.SheetNames[0];
        const sheet = workbook.Sheets[first];
        const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });
        onData(json);
      } catch (err) {
        console.error(err);
        alert('解析 Excel 失败，请检查格式');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(templates[templateType]);
    XLSX.utils.book_append_sheet(wb, ws, '模板');
    XLSX.writeFile(wb, `${templateType === 'system' ? '系统' : '单元'}数据模板.xlsx`);
  };

  return (
    <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
      <button
        onClick={() => inputRef.current?.click()}
        style={{
          padding: small ? '.35rem .6rem' : '.5rem .9rem',
          background: '#1476ff', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer'
        }}
      >{label}</button>
      <button
        onClick={downloadTemplate}
        style={{ padding: small ? '.35rem .6rem' : '.5rem .9rem', background: '#555', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
      >下载模板</button>
      <input ref={inputRef} type="file" accept=".xlsx,.xls" hidden onChange={e => {
        const f = e.target.files?.[0];
        if (f) handleFile(f);
        e.target.value = '';
      }} />
    </div>
  );
};
