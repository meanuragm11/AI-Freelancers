import * as React from 'react';

import { emailColors } from './styles';

export function SuccessIcon() {
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={{ margin: '0 auto 20px' }}>
      <tbody>
        <tr>
          <td
            align="center"
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              backgroundColor: emailColors.successBg,
              border: `1px solid ${emailColors.successBorder}`,
            }}
          >
            <div style={{ fontSize: 36, lineHeight: '72px', textAlign: 'center' }} aria-hidden="true">
              ✓
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
