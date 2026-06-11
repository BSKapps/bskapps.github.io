function hexToInt(hex) {
  return parseInt((hex || '#000000').replace('#', ''), 16);
}

function buttonControl(btn) {
  return {
    type: 'button',
    style: {
      text: btn.text || '',
      textExpression: false,
      size: 'auto',
      png64: btn.png64 || null,
      alignment: btn.text ? btn.alignment || 'center:center' : 'center:center',
      pngalignment: 'center:center',
      color: hexToInt(btn.color),
      bgcolor: hexToInt(btn.bgcolor),
      show_topbar: 'default'
    },
    options: {
      rotaryActions: false,
      stepAutoProgress: true
    },
    feedbacks: [],
    steps: {
      0: {
        action_sets: { down: [], up: [] },
        options: { runWhileHeld: [] }
      }
    }
  };
}

export function buildCompanionPage(buttons) {
  const controls = {};
  const cols = 8;
  let maxRow = 0;
  buttons.forEach((btn, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    if (!controls[row]) controls[row] = {};
    controls[row][col] = buttonControl(btn);
    maxRow = Math.max(maxRow, row);
  });

  return {
    version: 4,
    type: 'page',
    page: {
      name: 'BSK Button Maker',
      gridSize: {
        minColumn: 0,
        maxColumn: 7,
        minRow: 0,
        maxRow: Math.max(3, maxRow)
      },
      controls
    },
    instances: {},
    oldPageNumber: 1
  };
}
