import { Inject, Service } from 'typedi';
import { omit, difference } from 'lodash';
import {
  EventDispatcher,
  EventDispatcherInterface,
} from 'decorators/eventDispatcher';
import JournalPoster from "services/Accounting/JournalPoster";
import JournalCommands from "services/Accounting/JournalCommands";
import ContactsService from 'services/Contacts/ContactsService';
import { 
  ICustomerNewDTO,
  ICustomerEditDTO,
  ICustomer,
  IPaginationMeta,
  ICustomersFilter
 } from 'interfaces';
import { ServiceError } from 'exceptions';
import TenancyService from 'services/Tenancy/TenancyService';
import DynamicListingService from 'services/DynamicListing/DynamicListService';
import events from 'subscribers/events';

@Service()
export default class CustomersService {
  @Inject()
  contactService: ContactsService;

  @Inject()
  tenancy: TenancyService;

  @Inject()
  dynamicListService: DynamicListingService;

  @Inject('logger')
  logger: any;

  @EventDispatcher()
  eventDispatcher: EventDispatcherInterface;

  /**
   * Converts customer to contact DTO.
   * @param {ICustomerNewDTO|ICustomerEditDTO} customerDTO 
   * @returns {IContactDTO}
   */
  private customerToContactDTO(customerDTO: ICustomerNewDTO | ICustomerEditDTO) {
    return {
      ...omit(customerDTO, ['customerType']),
      contactType: customerDTO.customerType,
      active: (typeof customerDTO.active === 'undefined') ?
        true : customerDTO.active,
    };
  }

  /**
   * Creates a new customer.
   * @param {number} tenantId 
   * @param {ICustomerNewDTO} customerDTO 
   * @return {Promise<ICustomer>}
   */
  public async newCustomer(
    tenantId: number,
    customerDTO: ICustomerNewDTO
  ): Promise<ICustomer> {
    this.logger.info('[customer] trying to create a new customer.', { tenantId, customerDTO });

    const contactDTO = this.customerToContactDTO(customerDTO)
    const customer = await this.contactService.newContact(tenantId, contactDTO, 'customer');

    this.logger.info('[customer] created successfully.', { tenantId, customerDTO });
    await this.eventDispatcher.dispatch(events.customers.onCreated);

    return customer;
  }

  /**
   * Edits details of the given customer.
   * @param {number} tenantId 
   * @param {number} customerId
   * @param {ICustomerEditDTO} customerDTO 
   * @return {Promise<ICustomer>}
   */
  public async editCustomer(
    tenantId: number,
    customerId: number,
    customerDTO: ICustomerEditDTO,
  ): Promise<ICustomer> {
    const contactDTO = this.customerToContactDTO(customerDTO);

    this.logger.info('[customer] trying to edit customer.', { tenantId, customerId, customerDTO });
    const customer = this.contactService.editContact(tenantId, customerId, contactDTO, 'customer');

    this.eventDispatcher.dispatch(events.customers.onEdited);
    this.logger.info('[customer] edited successfully.', { tenantId, customerId });

    return customer;
  }

  /**
   * Deletes the given customer from the storage.
   * @param {number} tenantId 
   * @param {number} customerId 
   * @return {Promise<void>}
   */
  public async deleteCustomer(tenantId: number, customerId: number): Promise<void> {
    const { Contact } = this.tenancy.models(tenantId);
    this.logger.info('[customer] trying to delete customer.', { tenantId, customerId });

    await this.getCustomerByIdOrThrowError(tenantId, customerId);
    await this.customerHasNoInvoicesOrThrowError(tenantId, customerId);

    await Contact.query().findById(customerId).delete();

    await this.eventDispatcher.dispatch(events.customers.onDeleted);
    this.logger.info('[customer] deleted successfully.', { tenantId, customerId });
  }

  /**
   * Reverts customer opening balance journal entries.
   * @param {number} tenantId -
   * @param {number} customerId -
   * @return {Promise<void>}
   */
  public async revertOpeningBalanceEntries(tenantId: number, customerId: number|number[]) {
    const id = Array.isArray(customerId) ? customerId : [customerId];

    this.logger.info('[customer] trying to revert opening balance journal entries.', { tenantId, customerId });
    await this.contactService.revertJEntriesContactsOpeningBalance(
      tenantId, id, 'customer',
    );
  }

  /**
   * Retrieve the given customer details.
   * @param {number} tenantId 
   * @param {number} customerId 
   */
  public async getCustomer(tenantId: number, customerId: number) {
    return this.contactService.getContact(tenantId, customerId, 'customer');
  }

  /**
   * Retrieve customers paginated list.
   * @param {number} tenantId - Tenant id.
   * @param {ICustomersFilter} filter - Cusotmers filter.
   */
  public async getCustomersList(
    tenantId: number,
    customersFilter: ICustomersFilter
  ): Promise<{ customers: ICustomer[], pagination: IPaginationMeta, filterMeta: IFilterMeta }> {
    const { Contact } = this.tenancy.models(tenantId);
    const dynamicList = await this.dynamicListService.dynamicList(tenantId, Contact, customersFilter);

    const { results, pagination } = await Contact.query().onBuild((query) => {
      query.modify('customer');
      dynamicList.buildQuery()(query);
    }).pagination(
      customersFilter.page - 1,
      customersFilter.pageSize,
    );

    return {
      customers: results,
      pagination,
      filterMeta: dynamicList.getResponseMeta(),
    };
  }

  /**
   * Writes customer opening balance journal entries.
   * @param {number} tenantId 
   * @param {number} customerId 
   * @param {number} openingBalance 
   * @return {Promise<void>}
   */
  public async writeCustomerOpeningBalanceJournal(
    tenantId: number,
    customerId: number,
    openingBalance: number,
  ) {
    const journal = new JournalPoster(tenantId);
    const journalCommands = new JournalCommands(journal);

    await journalCommands.customerOpeningBalance(customerId, openingBalance)

    await Promise.all([
      journal.saveBalance(),
      journal.saveEntries(),
    ]);
  }

  /**
   * Retrieve the given customer by id or throw not found.
   * @param {number} tenantId 
   * @param {number} customerId 
   */
  public getCustomerByIdOrThrowError(tenantId: number, customerId: number) {
    return this.contactService.getContactByIdOrThrowError(tenantId, customerId, 'customer');
  }

  /**
   * Retrieve the given customers or throw error if one of them not found.
   * @param {numebr} tenantId 
   * @param {number[]} customersIds
   */
  private getCustomersOrThrowErrorNotFound(tenantId: number, customersIds: number[]) {
    return this.contactService.getContactsOrThrowErrorNotFound(tenantId, customersIds, 'customer');
  }

  /**
   * Deletes the given customers from the storage.
   * @param {number} tenantId 
   * @param {number[]} customersIds 
   * @return {Promise<void>}
   */
  public async deleteBulkCustomers(tenantId: number, customersIds: number[]) {
    const { Contact } = this.tenancy.models(tenantId);

    await this.getCustomersOrThrowErrorNotFound(tenantId, customersIds);
    await this.customersHaveNoInvoicesOrThrowError(tenantId, customersIds);

    await Contact.query().whereIn('id', customersIds).delete();
    await this.eventDispatcher.dispatch(events.customers.onBulkDeleted);
  }

  /**
   * Validates the customer has no associated sales invoice
   * or throw service error.
   * @param {number} tenantId 
   * @param {number} customerId 
   * @throws {ServiceError}
   * @return {Promise<void>}
   */
  private async customerHasNoInvoicesOrThrowError(tenantId: number, customerId: number) {
    const { customerRepository } = this.tenancy.repositories(tenantId);
    const salesInvoice = await customerRepository.getSalesInvoices(customerId);

    if (salesInvoice.length > 0) {
      throw new ServiceError('customer_has_invoices');
    }
  }

  /**
   * Throws error in case one of customers have associated sales invoices.
   * @param  {number} tenantId 
   * @param  {number[]} customersIds 
   * @throws {ServiceError}
   * @return {Promise<void>}
   */
  private async customersHaveNoInvoicesOrThrowError(tenantId: number, customersIds: number[]) {
    const { customerRepository } = this.tenancy.repositories(tenantId);

    const customersWithInvoices = await customerRepository.customersWithSalesInvoices(
      customersIds,
    );
    const customersIdsWithInvoice = customersWithInvoices
      .filter((customer: ICustomer) => customer.salesInvoices.length > 0)
      .map((customer: ICustomer) => customer.id);

    const customersHaveInvoices = difference(customersIds, customersIdsWithInvoice);

    if (customersHaveInvoices.length > 0) {
      throw new ServiceError('some_customers_have_invoices');
    }
  }
}