import { Student } from './Student';
import { Enrollment } from './Enrollment';
import { EspecificacaoDoCalculoDaMedia } from './EspecificacaoDoCalculoDaMedia';

export class Class {
  private topic: string;
  private semester: number;
  private year: number;
  private readonly especificacaoDoCalculoDaMedia: EspecificacaoDoCalculoDaMedia;
  private enrollments: Enrollment[];
  private prazoAcademico: Date | null = null; // Turmas existentes começam sem prazo; nenhum prazo é presumido.

  constructor(topic: string, semester: number, year: number, especificacaoDoCalculoDaMedia: EspecificacaoDoCalculoDaMedia, enrollments: Enrollment[] = []) {
    this.topic = topic;
    this.semester = semester;
    this.year = year;
    this.especificacaoDoCalculoDaMedia = especificacaoDoCalculoDaMedia;
    this.enrollments = enrollments;
  }

  // Getters
  getTopic(): string {
    return this.topic;
  }

  getSemester(): number {
    return this.semester;
  }

  getYear(): number {
    return this.year;
  }

  getPrazoAcademico(): Date | null { // Permite consultar o prazo sem expor o objeto interno à alteração.
    return this.prazoAcademico
      ? new Date(this.prazoAcademico.getTime())
      : null; // Retorna uma cópia da data ou indica que o prazo ainda não foi cadastrado.
  }

  getEnrollments(): Enrollment[] {
    return [...this.enrollments]; // Return copy to prevent external modification
  }

  // Generate unique class ID
  getClassId(): string {
    return `${this.topic}-${this.year}-${this.semester}`;
  }

  // Setters for editing
  setTopic(topic: string): void {
    this.topic = topic;
  }

  setSemester(semester: number): void {
    this.semester = semester;
  }

  setYear(year: number): void {
    this.year = year;
  }

  setPrazoAcademico(prazoAcademico: Date): void { // Define ou altera o prazo da turma.
    if (!Number.isFinite(prazoAcademico.getTime())) { // Uma data inválida produz um horário numérico inválido.
      throw new Error('Prazo acadêmico inválido');
    }

    this.prazoAcademico = new Date(prazoAcademico.getTime()); // Guarda uma cópia para impedir alterações externas à data recebida.
  }

  getEspecificacaoDoCalculoDaMedia(): EspecificacaoDoCalculoDaMedia {
    return this.especificacaoDoCalculoDaMedia;
  }

  prazoEncerrado(instanteAtual: Date): boolean { // Implementa a consulta prevista no DDD usando o instante fornecido pelo serviço.
    if (this.prazoAcademico === null) {
      throw new Error('Prazo acadêmico não definido para a turma'); // Exige um prazo conhecido para avaliar seu encerramento.
    }

    if (!Number.isFinite(instanteAtual.getTime())) {
      throw new Error('Instante atual inválido'); // Impede uma comparação que produziria um resultado incorreto.
    }

    return instanteAtual.getTime() > this.prazoAcademico.getTime(); // Exatamente no prazo ainda é permitido; somente depois dele está encerrado.
  }

  // Enrollment management
  addEnrollment(student: Student): Enrollment {
    // Check if student is already enrolled
    const existingEnrollment = this.findEnrollmentByStudentCPF(student.getCPF());
    if (existingEnrollment) {
      throw new Error('Student is already enrolled in this class');
    }

    const enrollment = new Enrollment(student);
    this.enrollments.push(enrollment);
    return enrollment;
  }

  removeEnrollment(studentCPF: string): boolean {
    const index = this.enrollments.findIndex(enrollment => 
      enrollment.getStudent().getCPF() === studentCPF
    );
    
    if (index === -1) {
      return false;
    }

    this.enrollments.splice(index, 1);
    return true;
  }

  findEnrollmentByStudentCPF(studentCPF: string): Enrollment | undefined {
    return this.enrollments.find(enrollment => 
      enrollment.getStudent().getCPF() === studentCPF
    );
  }

  // Get all enrolled students
  getEnrolledStudents(): Student[] {
    return this.enrollments.map(enrollment => enrollment.getStudent());
  }

  // Convert to JSON for API responses
  toJSON() {
    return {
      id: this.getClassId(),
      topic: this.topic,
      semester: this.semester,
      year: this.year,
      prazoAcademico: this.prazoAcademico?.toISOString() ?? null, // Converte a data para texto ISO; mantém null quando não existe prazo.
      especificacaoDoCalculoDaMedia: this.especificacaoDoCalculoDaMedia.toJSON(),
      enrollments: this.enrollments.map(enrollment => enrollment.toJSON())
    };
  }

  // Create Class from JSON object
  static fromJSON(data: {
    topic: string;
    semester: number;
    year: number;
    especificacaoDoCalculoDaMedia: any;
    enrollments: any[];
    prazoAcademico?: string | null; // O campo pode estar ausente em dados antigos ou ser null em turmas sem prazo.
  }, allStudents: Student[]): Class {
    const enrollments = data.enrollments
      ? data.enrollments.map((enrollmentData: any) => {
          const student = allStudents.find(s => s.getCPF() === enrollmentData.student.cpf);
          if (!student) {
            throw new Error(`Student with CPF ${enrollmentData.student.cpf} not found`);
          }
          return Enrollment.fromJSON(enrollmentData, student);
        })
      : [];
    
    // Novo carregamento do EspecificacaoDoCalculoDaMedia
    const especificacaoDoCalculoDaMedia = EspecificacaoDoCalculoDaMedia.fromJSON(data.especificacaoDoCalculoDaMedia);

    const classObj = new Class(data.topic, data.semester, data.year, especificacaoDoCalculoDaMedia, enrollments); // Reconstrói os dados existentes da turma.

    if (data.prazoAcademico !== undefined && data.prazoAcademico !== null) {
      classObj.setPrazoAcademico(new Date(data.prazoAcademico)); // Converte o texto em Date e reutiliza a validação da entidade.
    }

    return classObj; // Retorna a turma com o prazo recuperado, quando informado.
  }
}
