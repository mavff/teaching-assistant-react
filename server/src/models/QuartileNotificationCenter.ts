import { Class } from './Class';
import { QuartileNotification, QuartileNotificationData } from './QuartileNotification';
import { Quartile, classifyQuartiles, performanceOf } from './Quartile';

export interface QuartileNotificationCenterState {
  notifications: QuartileNotificationData[];
  quartiles: { classId: string; studentCPF: string; quartile: Quartile }[];
  announced: { classId: string; studentCPF: string }[];
}

/**
 * Keeps the last known quartile of every student in every class and the
 * notifications generated when it changes.
 *
 * Nothing is sent while the class is incomplete (some enrolled student still
 * has an evaluation goal without a grade): quartiles are only recorded.
 * When every enrolled student has every goal graded, each student receives
 * one classification notification with their quartile, once per student and
 * class (`announced`). From then on a notification is created only when the
 * newly computed quartile differs from the last one the student was told, and
 * that quartile is updated at the same time, so running the same update twice
 * never repeats a notification. A student who is no longer classified has the
 * record dropped.
 */
export class QuartileNotificationCenter {
  private notifications: QuartileNotification[] = [];
  private lastQuartiles = new Map<string, Quartile>(); // `${classId}|${cpf}`
  private announced = new Set<string>(); // students already told their quartile, `${classId}|${cpf}`
  private nextId = 1;

  constructor(private readonly now: () => Date = () => new Date()) {}

  private key(classId: string, cpf: string): string {
    return `${classId}|${cpf}`;
  }

  private currentQuartiles(classObj: Class): Map<string, Quartile> {
    const specification = classObj.getEspecificacaoDoCalculoDaMedia();
    const performances = new Map<string, number>();
    for (const enrollment of classObj.getEnrollments()) {
      const performance = performanceOf(enrollment, specification);
      if (performance !== null) {
        performances.set(enrollment.getStudent().getCPF(), performance);
      }
    }
    return classifyQuartiles(performances);
  }

  /**
   * True when the class has students and none of them has a grade pending: the
   * same rule (Class.identificarPendencias) the reminders use to find missing grades.
   */
  private isFullyGraded(classObj: Class): boolean {
    return classObj.getEnrollments().length > 0 && classObj.identificarPendencias().length === 0;
  }

  private forgetClass(classId: string): void {
    for (const key of Array.from(this.lastQuartiles.keys())) {
      if (key.startsWith(`${classId}|`)) {
        this.lastQuartiles.delete(key);
      }
    }
    for (const key of Array.from(this.announced)) {
      if (key.startsWith(`${classId}|`)) {
        this.announced.delete(key);
      }
    }
  }

  /**
   * Recomputes the quartiles of a class after its performance data changed
   * and notifies the students whose quartile changed.
   * @returns the notifications created by this update
   */
  refreshClass(classObj: Class): QuartileNotification[] {
    const classId = classObj.getClassId();
    const current = this.currentQuartiles(classObj);
    const created: QuartileNotification[] = [];
    const fullyGraded = this.isFullyGraded(classObj);

    for (const enrollment of classObj.getEnrollments()) {
      const cpf = enrollment.getStudent().getCPF();
      const key = this.key(classId, cpf);
      const quartile = current.get(cpf);
      const previous = this.lastQuartiles.get(key);

      if (quartile === undefined) {
        this.lastQuartiles.delete(key);
        continue;
      }
      if (!this.announced.has(key)) {
        // the student was not told their quartile yet: only records it (the
        // classification notification below tells it once the class is complete)
        this.lastQuartiles.set(key, quartile);
        continue;
      }
      // announced student: changes are notified only while the class is complete;
      // otherwise the quartile they were last told is kept for the comparison
      if (fullyGraded && previous !== undefined && previous !== quartile) {
        const notification = QuartileNotification.forQuartileChange(this.nextId++, cpf, classId, previous, quartile, this.now());
        this.notifications.push(notification);
        created.push(notification);
      }
      if (fullyGraded || previous === undefined) {
        this.lastQuartiles.set(key, quartile);
      }
    }

    // once every grade of the class was entered, tells each student their quartile (once)
    if (fullyGraded) {
      for (const enrollment of classObj.getEnrollments()) {
        const cpf = enrollment.getStudent().getCPF();
        const key = this.key(classId, cpf);
        const quartile = current.get(cpf);
        if (quartile !== undefined && !this.announced.has(key)) {
          const notification = QuartileNotification.forClassification(this.nextId++, cpf, classId, quartile, this.now());
          this.notifications.push(notification);
          created.push(notification);
          this.announced.add(key);
        }
      }
    }

    // drops records of students no longer enrolled in the class
    const enrolled = new Set(classObj.getEnrollments().map(e => this.key(classId, e.getStudent().getCPF())));
    for (const key of Array.from(this.lastQuartiles.keys())) {
      if (key.startsWith(`${classId}|`) && !enrolled.has(key)) {
        this.lastQuartiles.delete(key);
      }
    }
    for (const key of Array.from(this.announced)) {
      if (key.startsWith(`${classId}|`) && !enrolled.has(key)) {
        this.announced.delete(key);
      }
    }
    return created;
  }

  /**
   * Records the current quartiles of a class without notifying anyone, for quartiles not recorded yet.
   * A class that is already fully graded when loaded is treated as already announced.
   */
  recordCurrentQuartiles(classObj: Class): void {
    const classId = classObj.getClassId();
    const current = this.currentQuartiles(classObj);
    const fullyGraded = this.isFullyGraded(classObj);
    for (const [cpf, quartile] of current) {
      const key = this.key(classId, cpf);
      if (!this.lastQuartiles.has(key)) {
        this.lastQuartiles.set(key, quartile);
      }
      if (fullyGraded) {
        this.announced.add(key);
      }
    }
  }

  /** Forgets the quartiles of a class that no longer exists. */
  removeClass(classId: string): void {
    this.forgetClass(classId);
  }

  /**
   * Follows a class whose identification (topic, year or semester) changed:
   * what is recorded about it, and its notifications, move to the new id, so
   * that the class is not treated as a new one (and announced again).
   */
  renameClass(oldClassId: string, newClassId: string): void {
    if (oldClassId === newClassId) {
      return;
    }
    const move = (key: string) => `${newClassId}|${key.slice(oldClassId.length + 1)}`;
    this.lastQuartiles = new Map(Array.from(this.lastQuartiles, ([key, quartile]) =>
      [key.startsWith(`${oldClassId}|`) ? move(key) : key, quartile] as [string, Quartile]));
    this.announced = new Set(Array.from(this.announced, key => key.startsWith(`${oldClassId}|`) ? move(key) : key));
    this.notifications.forEach(n => n.changeClassId(oldClassId, newClassId));
  }

  /** Forgets the notifications and quartiles of a student who was removed from the system. */
  removeStudent(studentCPF: string): void {
    this.notifications = this.notifications.filter(n => n.getStudentCPF() !== studentCPF);
    for (const key of Array.from(this.lastQuartiles.keys())) {
      if (key.endsWith(`|${studentCPF}`)) {
        this.lastQuartiles.delete(key);
      }
    }
    for (const key of Array.from(this.announced)) {
      if (key.endsWith(`|${studentCPF}`)) {
        this.announced.delete(key);
      }
    }
  }

  /** Notifications of one student, newest first. Never includes anyone else's. */
  getNotificationsOf(studentCPF: string): QuartileNotification[] {
    return this.notifications
      .filter(n => n.getStudentCPF() === studentCPF)
      .reverse();
  }

  /** Marks a notification as read, only if it belongs to the given student. */
  markAsRead(studentCPF: string, notificationId: number): QuartileNotification | undefined {
    const notification = this.notifications.find(n => n.getId() === notificationId && n.getStudentCPF() === studentCPF);
    notification?.markAsRead();
    return notification;
  }

  toJSON(): QuartileNotificationCenterState {
    return {
      notifications: this.notifications.map(n => n.toJSON()),
      quartiles: Array.from(this.lastQuartiles, ([key, quartile]) => {
        const [classId, studentCPF] = [key.slice(0, key.lastIndexOf('|')), key.slice(key.lastIndexOf('|') + 1)];
        return { classId, studentCPF, quartile };
      }),
      announced: Array.from(this.announced, key => {
        const [classId, studentCPF] = [key.slice(0, key.lastIndexOf('|')), key.slice(key.lastIndexOf('|') + 1)];
        return { classId, studentCPF };
      })
    };
  }

  restore(state?: Partial<QuartileNotificationCenterState>): void {
    this.notifications = (state?.notifications ?? []).map(QuartileNotification.fromJSON);
    this.nextId = this.notifications.reduce((max, n) => Math.max(max, n.getId()), 0) + 1;
    this.lastQuartiles = new Map((state?.quartiles ?? []).map(q => [this.key(q.classId, q.studentCPF), q.quartile]));
    this.announced = new Set((state?.announced ?? []).map(a => this.key(a.classId, a.studentCPF)));
  }
}
