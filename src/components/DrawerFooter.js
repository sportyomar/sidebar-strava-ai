import React from 'react';
import styles from './SidebarFooter.module.css'

function SidebarFooter({mode, setMode}) {
    return (
        <div className={styles.footer}>
            <label>Mode</label>
            {/* onChange is a version of onClick, but for form fields
            e.target.value is required in form fields (like <select>) because the user is choosing a value dynamically.
            The value isn't hardcoded, it comes from the dropdown selection that the user makes in real time.


            Example:
            When someone selects "Executive" from the dropdown,
            the form triggers onChange. we must read the real time value from e.target.value

            In contrast, setActiveView('Metrics') inside an onClick is not dynamic.
            It's a fixed value hardcoded to the Metrics button, so no need to read from the event.
            */}
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="executive">Executive</option>
                <option value="partner">Partner</option>
                <option value="consultant">Consultant</option>
            </select>
        </div>
    )
}

export default SidebarFooter;