import { JSX } from "solid-js";
import { Form } from "~/components/Form";
import { AccordionStates } from "../Configuration/ConfigForm/ConfigForm";

export type LoggingFormProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id: string;
  formData: object;
  accordionStates: AccordionStates;
  originalFile?: object;
  description?: object;
};

// A custom form component adpated to Logging configuration format.
export function LoggingForm(props: LoggingFormProps) {
  const logForm = props.formData;

  return (
    <div
      ref={props.ref}
      style={{
        "overflow-y": "auto",
        "padding-left": "0.5rem",
        "padding-right": "0.5rem",
      }}
    >
      <Form
        id={props.id}
        value={logForm}
        accordionStates={props.accordionStates}
        originalFile={props.originalFile}
        description={props.description}
      />
    </div>
  );
}
