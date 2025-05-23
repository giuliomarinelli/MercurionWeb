// import { Injectable } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { UUID } from 'crypto';
// import { LabNotebook } from '../Models/entities/lab-notebook/lab-notebook.entity';

// @Injectable()
// export class LabNotebookService {
//     constructor(
//         @InjectRepository(LabNotebook)
//         private readonly notebookRepo: Repository<LabNotebook>,
//     ) { }

//     async create(userId: UUID, title: string): Promise<LabNotebook> {
//         const notebook = this.notebookRepo.create({ userId, title, createdAt: Date.now() })
//         return await this.notebookRepo.save(notebook)
//     }

//     async findOne(id: UUID, userId: UUID): Promise<LabNotebook | null> {
//         return this.notebookRepo.findOne({ where: { id, userId }, relations: ['chapters'] })
//     }

//     async findAllByUser(userId: UUID): Promise<LabNotebook[]> {
//         return this.notebookRepo.find({ where: { userId }, order: { createdAt: 'DESC' } })
//     }

//     async update(id: UUID, userId: UUID, data: Partial<LabNotebook>): Promise<LabNotebook | null> {
//         await this.notebookRepo.update({ id }, data)
//         return this.findOne(id, userId)
//     }

//     async delete(id: UUID, userId: UUID): Promise<boolean> {
//         try {
//             await this.notebookRepo.delete({ id, userId })
//             return true
//         } catch {
//             return false
//         }
//     }
// }
