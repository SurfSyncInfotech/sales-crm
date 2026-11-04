import { useState, useRef, useEffect } from 'react';
import { Target, ChevronDown, Check, MessageSquare } from 'lucide-react';

export default function CampaignFilterDropdown({
  value,
  onChange,
  campaigns = [],
  allLabel = 'All Campaigns',
  allValue = 'all',
  height = '38px',
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const isFiltered = value && value !== allValue;

  // Find active label to display on trigger
  const displayLabel = isFiltered
    ? value
    : `${allLabel} (${campaigns.length})`;

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function handleSelect(val) {
    onChange(val);
    setOpen(false);
  }

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'relative',
        display: 'inline-block',
      }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          height,
          padding: '0 12px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: isFiltered ? '#FFF3E6' : '#FFFFFF',
          border: isFiltered ? '1.5px solid #F68713' : '1px solid #E6E9EE',
          borderRadius: '8px',
          color: isFiltered ? '#B45309' : '#374151',
          fontSize: '13px',
          fontWeight: isFiltered ? 700 : 600,
          cursor: 'pointer',
          outline: 'none',
          boxShadow: isFiltered
            ? '0 1px 3px rgba(246, 135, 19, 0.15)'
            : '0 1px 2px rgba(0, 0, 0, 0.02)',
          transition: 'all 0.15s ease',
          whiteSpace: 'nowrap',
          maxWidth: '260px',
        }}
        title="Filter by Live Campaign"
      >
        {String(displayLabel).toLowerCase().includes('whatsapp') ? (
          <MessageSquare size={14} color="#059669" />
        ) : (
          <Target size={14} color={isFiltered ? '#F68713' : '#6B7280'} />
        )}
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '180px',
          }}
        >
          {displayLabel}
        </span>
        <ChevronDown
          size={13}
          color={isFiltered ? '#F68713' : '#9CA3AF'}
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.18s ease',
            marginLeft: 'auto',
          }}
        />
      </button>

      {/* Branded Orange Custom Popup Menu */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 5px)',
            left: 0,
            minWidth: '240px',
            maxWidth: '320px',
            backgroundColor: '#FFFFFF',
            border: '1.5px solid #FED7AA',
            borderRadius: '10px',
            boxShadow: '0 12px 28px -4px rgba(246, 135, 19, 0.18), 0 8px 12px -6px rgba(0, 0, 0, 0.05)',
            zIndex: 9999,
            padding: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          {/* Header info */}
          <div
            style={{
              padding: '6px 10px 4px 10px',
              fontSize: '10.5px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#9A3412',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              borderBottom: '1px solid #FFEDD5',
              marginBottom: '4px',
            }}
          >
            <Target size={12} color="#F68713" />
            <span>Live Ad Campaigns</span>
            <span
              style={{
                marginLeft: 'auto',
                backgroundColor: '#FFF3E6',
                color: '#F68713',
                fontSize: '10px',
                fontWeight: 800,
                padding: '1px 6px',
                borderRadius: '999px',
              }}
            >
              {campaigns.length}
            </span>
          </div>

          {/* Option: All Campaigns */}
          <button
            type="button"
            onClick={() => handleSelect(allValue)}
            style={{
              width: '100%',
              padding: '8px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: !isFiltered ? '#FFF3E6' : 'transparent',
              color: !isFiltered ? '#B45309' : '#374151',
              fontSize: '12.5px',
              fontWeight: !isFiltered ? 700 : 500,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background-color 0.12s ease',
            }}
            onMouseEnter={(e) => {
              if (isFiltered) {
                e.currentTarget.style.backgroundColor = '#FFF8F1';
                e.currentTarget.style.color = '#EA580C';
              }
            }}
            onMouseLeave={(e) => {
              if (isFiltered) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#374151';
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={13} color={!isFiltered ? '#F68713' : '#9CA3AF'} />
              <span>{allLabel} ({campaigns.length})</span>
            </div>
            {!isFiltered && <Check size={14} color="#F68713" strokeWidth={2.5} />}
          </button>

          {/* Individual Campaign Options */}
          {campaigns.map((camp) => {
            const isSelected = value === camp;
            return (
              <button
                key={camp}
                type="button"
                onClick={() => handleSelect(camp)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: isSelected ? '#FFF3E6' : 'transparent',
                  color: isSelected ? '#B45309' : '#374151',
                  fontSize: '12.5px',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.12s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = '#FFF8F1';
                    e.currentTarget.style.color = '#EA580C';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#374151';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  {String(camp).toLowerCase().includes('whatsapp') ? (
                    <MessageSquare size={13} color={isSelected ? '#059669' : '#10B981'} style={{ flexShrink: 0 }} />
                  ) : (
                    <Target size={13} color={isSelected ? '#F68713' : '#9CA3AF'} style={{ flexShrink: 0 }} />
                  )}
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={camp}
                  >
                    {camp}
                  </span>
                </div>
                {isSelected && <Check size={14} color="#F68713" strokeWidth={2.5} style={{ flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
