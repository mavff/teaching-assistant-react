import { EspecificacaoDoCalculoDaMedia } from './EspecificacaoDoCalculoDaMedia';
import { Enrollment } from './Enrollment';

export interface Class {
  id: string;
  topic: string;
  semester: number;
  year: number;
  prazoAcademico?: string | null; // Prazo compartilhado do período em ISO. A edição passa pela API de períodos.
  especificacaoDoCalculoDaMedia: EspecificacaoDoCalculoDaMedia;
  enrollments: Enrollment[];
}

export interface CreateClassRequest {
  topic: string;
  semester: number;
  year: number;
  especificacaoDoCalculoDaMedia: EspecificacaoDoCalculoDaMedia;
}

export interface UpdateClassRequest {
  topic?: string;
  semester?: number;
  year?: number;
}

// Helper function to generate class ID
export const getClassId = (classObj: { topic: string; year: number; semester: number }): string => {
  return `${classObj.topic}-${classObj.year}-${classObj.semester}`;
};
