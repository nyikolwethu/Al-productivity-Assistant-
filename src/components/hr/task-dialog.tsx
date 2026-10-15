import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, CURRENT_USER, DEPARTMENTS, EMPLOYEES, PRIORITIES, STATUSES, today, useStore, type Task } from "@/lib/store";

type Form = Omit<Task, "id" | "createdAt">;
const blank = (): Form => ({
  title: "", description: "", category: CATEGORIES[0], priority: "Medium", status: "To Do",
  startDate: today(), dueDate: today(), dueTime: "17:00", assignee: CURRENT_USER.name, department: "Human Resources", notes: "",
});

function Sel({ label, value, onChange, items }: { label: string; value: string; onChange: (v: string) => void; items: readonly string[] }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{items.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

export function TaskDialog() {
  const { taskDialog, closeTaskDialog, addTask, updateTask } = useStore();
  const [f, setF] = useState<Form>(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (taskDialog.open) {
      const { id: _i, createdAt: _c, ...rest } = taskDialog.task ?? ({} as Task);
      setF(taskDialog.task ? (rest as Form) : { ...blank(), ...taskDialog.prefill });
      setErrors({});
    }
  }, [taskDialog]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  const submit = () => {
    const e: Record<string, string> = {};
    if (!f.title.trim()) e.title = "Title is required";
    if (f.title.length > 120) e.title = "Keep the title under 120 characters";
    if (!f.dueDate) e.dueDate = "Due date is required";
    if (f.startDate && f.dueDate && f.startDate > f.dueDate) e.dueDate = "Due date can't be before the start date";
    setErrors(e);
    if (Object.keys(e).length) return;
    if (taskDialog.task) {
      updateTask(taskDialog.task.id, f);
      toast.success("Task updated");
    } else {
      addTask(f);
      toast.success("Task created");
    }
    closeTaskDialog();
  };

  return (
    <Dialog open={taskDialog.open} onOpenChange={(o) => !o && closeTaskDialog()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{taskDialog.task ? "Edit task" : "New task"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Task title *</Label>
            <Input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Schedule onboarding session" />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Description</Label>
            <Textarea rows={2} value={f.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <Sel label="Category" value={f.category} onChange={(v) => set("category", v)} items={CATEGORIES} />
          <Sel label="Priority" value={f.priority} onChange={(v) => set("priority", v as Form["priority"])} items={PRIORITIES} />
          <Sel label="Status" value={f.status} onChange={(v) => set("status", v as Form["status"])} items={STATUSES} />
          <Sel label="Assigned employee" value={f.assignee} onChange={(v) => set("assignee", v)} items={EMPLOYEES} />
          <div className="space-y-1.5">
            <Label>Start date</Label>
            <Input type="date" value={f.startDate} onChange={(e) => set("startDate", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Due date *</Label>
            <Input type="date" value={f.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
            {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Due time</Label>
            <Input type="time" value={f.dueTime} onChange={(e) => set("dueTime", e.target.value)} />
          </div>
          <Sel label="Related department" value={f.department} onChange={(v) => set("department", v)} items={DEPARTMENTS} />
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Notes (optional)</Label>
            <Textarea rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={closeTaskDialog}>Cancel</Button>
          <Button onClick={submit}>{taskDialog.task ? "Save changes" : "Create task"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
