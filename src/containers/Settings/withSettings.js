import { connect } from 'react-redux';

export default (mapState) => {
  const mapStateToProps = (state, props) => {
    const mapped = {
      organizationSettings: state.settings.data.organization,
      manualJournalsSettings: state.settings.data.manualJournals,
      billPaymentSettings: state.settings.data.billPayments,
      billsettings: state.settings.data.bills,
      paymentReceiveSettings: state.settings.data.paymentReceives,
      estimatesSettings: state.settings.data.salesEstimates,
      receiptSettings: state.settings.data.salesReceipts,
      invoiceSettings: state.settings.data.salesInvoices,
      itemsSettings: state.settings.data.items,
      expenseSettings: state.settings.data.expenses,
      accountsSettings: state.settings.data.accounts,
      customersSettings: state.settings.data.customers,
      vendorsSettings: state.settings.data.vendors,
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };

  return connect(mapStateToProps);
};