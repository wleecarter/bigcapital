import React from 'react';
import { useFormikContext } from 'formik';
import moment from 'moment';
import * as R from 'ramda';
import intl from 'react-intl-universal';
import { omit } from 'lodash';
import {
  defaultFastFieldShouldUpdate,
  transactionNumber,
  repeatValue,
  transformToForm,
} from 'utils';
import {
  updateItemsEntriesTotal,
  ensureEntriesHaveEmptyLine,
} from 'containers/Entries/utils';

export const MIN_LINES_NUMBER = 4;

export const defaultReceiptEntry = {
  index: 0,
  item_id: '',
  rate: '',
  discount: '',
  quantity: '',
  description: '',
  amount: '',
};

export const defaultReceipt = {
  customer_id: '',
  deposit_account_id: '',
  receipt_number: '',
  receipt_date: moment(new Date()).format('YYYY-MM-DD'),
  reference_no: '',
  receipt_message: '',
  statement: '',
  closed: '',
  entries: [...repeatValue(defaultReceiptEntry, MIN_LINES_NUMBER)],
};

const ERRORS = {
  SALE_RECEIPT_NUMBER_NOT_UNIQUE: 'SALE_RECEIPT_NUMBER_NOT_UNIQUE',
  SALE_RECEIPT_NO_IS_REQUIRED: 'SALE_RECEIPT_NO_IS_REQUIRED',
};

/**
 * Transform to form in edit mode.
 */
export const transformToEditForm = (receipt) => {
  const initialEntries = [
    ...receipt.entries.map((entry) => ({
      ...transformToForm(entry, defaultReceiptEntry),
    })),
    ...repeatValue(
      defaultReceiptEntry,
      Math.max(MIN_LINES_NUMBER - receipt.entries.length, 0),
    ),
  ];
  const entries = R.compose(
    ensureEntriesHaveEmptyLine(defaultReceiptEntry),
    updateItemsEntriesTotal,
  )(initialEntries);

  return {
    ...transformToForm(receipt, defaultReceipt),
    entries,
  };
};

export const useObserveReceiptNoSettings = (prefix, nextNumber) => {
  const { setFieldValue } = useFormikContext();

  React.useEffect(() => {
    const receiptNo = transactionNumber(prefix, nextNumber);
    setFieldValue('receipt_number', receiptNo);
  }, [setFieldValue, prefix, nextNumber]);
};

/**
 * Detarmines entries fast field should update.
 */
export const entriesFieldShouldUpdate = (newProps, oldProps) => {
  return (
    newProps.items !== oldProps.items ||
    defaultFastFieldShouldUpdate(newProps, oldProps)
  );
};

/**
 * Detarmines accounts fast field should update.
 */
export const accountsFieldShouldUpdate = (newProps, oldProps) => {
  return (
    newProps.accounts !== oldProps.accounts ||
    defaultFastFieldShouldUpdate(newProps, oldProps)
  );
};

/**
 * Detarmines customers fast field should update.
 */
export const customersFieldShouldUpdate = (newProps, oldProps) => {
  return (
    newProps.customers !== oldProps.customers ||
    defaultFastFieldShouldUpdate(newProps, oldProps)
  );
};

/**
 * Transform response error to fields.
 */
export const handleErrors = (errors, { setErrors }) => {
  if (errors.some((e) => e.type === ERRORS.SALE_RECEIPT_NUMBER_NOT_UNIQUE)) {
    setErrors({
      receipt_number: intl.get('sale_receipt_number_not_unique'),
    });
  }
  if (errors.some((e) => e.type === ERRORS.SALE_RECEIPT_NO_IS_REQUIRED)) {
    setErrors({
      receipt_number: intl.get('receipt.field.error.receipt_number_required'),
    });
  }
};

/**
 * Transformes the form values to request body.
 * @param {*} values
 * @returns
 */
export const transformFormValuesToRequest = (values) => {
  const entries = values.entries.filter(
    (item) => item.item_id && item.quantity,
  );

  return {
    ...omit(values, ['receipt_number_manually', 'receipt_number']),
    ...(values.receipt_number_manually && {
      receipt_number: values.receipt_number,
    }),
    entries: entries.map((entry) => ({ ...omit(entry, ['amount']) })),
    closed: false,
  };
};