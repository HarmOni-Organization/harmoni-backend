import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Welcome to HarmOni!!!"', () => {
      expect(appController.getHello()).toBe('Welcome to HarmOni!!!');
    });
  });

  describe('GET /items', () => {
    it('should return all items', () => {
      const result = appController.getAllItems();
      expect(result.message).toBe('This endpoint returns all items');
      expect(result.method).toBe('GET');
      expect(result.items.length).toBe(2);
    });

    it('should handle sort query parameter', () => {
      const result = appController.getAllItems('name');
      expect(result.queryParams.sort).toBe('name');
    });
  });

  describe('GET /items/:id', () => {
    it('should return a single item by ID', () => {
      const result = appController.getItemById('1');
      expect(result.message).toBe(
        'This endpoint returns a single item with ID: 1',
      );
      expect(result.method).toBe('GET');
      expect(result.item.id).toBe(1);
      expect(result.item.name).toBe('Item 1');
    });
  });

  describe('POST /items', () => {
    it('should create a new item', () => {
      const createItemDto = { name: 'New Item' };
      const result = appController.createItem(createItemDto);
      expect(result.message).toBe('This endpoint creates a new item');
      expect(result.method).toBe('POST');
      expect(result.receivedData).toEqual(createItemDto);
      expect(result.createdItem.id).toBe(3);
      expect(result.createdItem.name).toBe('New Item');
    });
  });

  describe('PUT /items/:id', () => {
    it('should update an item', () => {
      const updateItemDto = { name: 'Updated Item' };
      const result = appController.updateItem('1', updateItemDto);
      expect(result.message).toBe('This endpoint updates an item with ID: 1');
      expect(result.method).toBe('PUT');
      expect(result.receivedData).toEqual(updateItemDto);
      expect(result.updatedItem.id).toBe(1);
      expect(result.updatedItem.name).toBe('Updated Item');
    });
  });

  describe('PATCH /items/:id', () => {
    it('should partially update an item', () => {
      const patchItemDto = { status: 'active' };
      const result = appController.partialUpdateItem('1', patchItemDto);
      expect(result.message).toBe(
        'This endpoint partially updates an item with ID: 1',
      );
      expect(result.method).toBe('PATCH');
      expect(result.receivedData).toEqual(patchItemDto);
      expect(result.patchedItem.id).toBe(1);
      expect(result.patchedItem.status).toBe('active');
    });
  });

  describe('DELETE /items/:id', () => {
    it('should delete an item', () => {
      const result = appController.deleteItem('1');
      expect(result.message).toBe('This endpoint deletes an item with ID: 1');
      expect(result.method).toBe('DELETE');
      expect(result.deletedItemId).toBe(1);
    });
  });
});
