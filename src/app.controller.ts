import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('items')
  getAllItems(@Query('sort') sort?: string) {
    return {
      message: 'This endpoint returns all items',
      method: 'GET',
      queryParams: { sort },
      items: [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ],
    };
  }

  @Get('items/:id')
  getItemById(@Param('id') id: string) {
    return {
      message: `This endpoint returns a single item with ID: ${id}`,
      method: 'GET',
      item: { id: parseInt(id), name: `Item ${id}` },
    };
  }

  @Post('items')
  createItem(@Body() createItemDto: any) {
    return {
      message: 'This endpoint creates a new item',
      method: 'POST',
      receivedData: createItemDto,
      createdItem: {
        id: 3,
        ...createItemDto,
      },
    };
  }

  @Put('items/:id')
  updateItem(@Param('id') id: string, @Body() updateItemDto: any) {
    return {
      message: `This endpoint updates an item with ID: ${id}`,
      method: 'PUT',
      receivedData: updateItemDto,
      updatedItem: {
        id: parseInt(id),
        ...updateItemDto,
      },
    };
  }

  @Patch('items/:id')
  partialUpdateItem(@Param('id') id: string, @Body() patchItemDto: any) {
    return {
      message: `This endpoint partially updates an item with ID: ${id}`,
      method: 'PATCH',
      receivedData: patchItemDto,
      patchedItem: {
        id: parseInt(id),
        name: `Item ${id} (patched)`,
        ...patchItemDto,
      },
    };
  }

  @Delete('items/:id')
  deleteItem(@Param('id') id: string) {
    return {
      message: `This endpoint deletes an item with ID: ${id}`,
      method: 'DELETE',
      deletedItemId: parseInt(id),
    };
  }
}
