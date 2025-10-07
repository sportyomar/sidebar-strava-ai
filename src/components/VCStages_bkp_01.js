import React from 'react';
import { motion } from 'framer-motion';
import styles from './VCStages.module.css';

const VCStages = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.2,
      },
    },
  };

  const rowVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  };

  const headerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  };

  return (
    <div className={styles.container}>
      <motion.div
        className={styles.tableWrapper}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={containerVariants}
      >
        <motion.table className={styles.table} variants={headerVariants}>
          <thead>
            <tr className={styles.headerRow}>
              <th className={styles.headerCell}> </th>
              <th className={styles.headerCell}>Early stage "Series A"</th>
              <th className={styles.headerCell}>Mid stage "Series B"</th>
              <th className={styles.headerCell}>Late stage "Series C"</th>
            </tr>
          </thead>
          <tbody>
            <motion.tr className={styles.dataRow} variants={rowVariants}>
              <td className={styles.rowLabel}>Management</td>
              <td className={styles.cell}>
                Small number of founders, often former executives and professionals
              </td>
              <td className={styles.cell}>
                Professional management team growing
              </td>
              <td className={styles.cell}>
                Professional management team growing
              </td>
            </motion.tr>

            <motion.tr className={styles.dataRow} variants={rowVariants}>
              <td className={styles.rowLabel}>Product and market</td>
              <td className={styles.cell}>
                Concept-stage, usually only represented by a “business plan”
              </td>
              <td className={styles.cell}>
                Working prototype or demonstrable product; “beta” tests begin with initial customers
              </td>
              <td className={styles.cell}>
                Product in production, some key customers established
              </td>
            </motion.tr>

            <motion.tr className={styles.dataRow} variants={rowVariants}>
              <td className={styles.rowLabel}>US dollars typically invested</td>
              <td className={styles.fundingCell}>
                <motion.span
                  className={styles.fundingAmount}
                  whileHover={{
                    scale: 1.05,
                    background: '#6ee7b7',
                    transition: { duration: 0.2 },
                  }}
                >
                  $3M–10M
                </motion.span>
              </td>
              <td className={styles.fundingCell}>
                <motion.span
                  className={styles.fundingAmount}
                  whileHover={{
                    scale: 1.05,
                    background: '#6ee7b7',
                    transition: { duration: 0.2 },
                  }}
                >
                  $5M–15M
                </motion.span>
              </td>
              <td className={styles.fundingCell}>
                <motion.span
                  className={styles.fundingAmount}
                  whileHover={{
                    scale: 1.05,
                    background: '#6ee7b7',
                    transition: { duration: 0.2 },
                  }}
                >
                  &gt;$10M
                </motion.span>
              </td>
            </motion.tr>

            <motion.tr className={styles.dataRow} variants={rowVariants}>
              <td className={styles.rowLabel}>Percentage of company acquired</td>
              <td className={styles.cell}>20–25%</td>
              <td className={styles.cell}>10–25%</td>
              <td className={styles.cell}>5–15%</td>
            </motion.tr>
          </tbody>
        </motion.table>
      </motion.div>
    </div>
  );
};

export default VCStages;
