import { FeatureValueType } from "back-end/types/feature";
import { ReactNode, useEffect, useRef, useState } from "react";
import { getJSONValidator } from "shared/util";
import Field from "@/components/Forms/Field";
import Toggle from "@/components/Forms/Toggle";
import { useUser } from "@/services/UserContext";

export interface Props {
  valueType: FeatureValueType;
  label: string;
  value: string;
  setValue: (v: string) => void;
  id: string;
  helpText?: ReactNode;
  type?: string;
  placeholder?: string;
  jsonSchema?: unknown;
}

export default function FeatureValueField({
  valueType,
  label,
  value,
  setValue,
  id,
  helpText,
  placeholder,
  jsonSchema,
}: Props) {
  const { hasCommercialFeature } = useUser();
  const hasJsonValidator = hasCommercialFeature("json-validation");

  const [rawJSONInput, setRawJSONInput] = useState(() => {
    if (valueType !== "json") return true;
    if (!hasJsonValidator) return true;
    if (!jsonSchema) return true;

    try {
      const parsed = JSON.parse(value);
      const ajv = getJSONValidator();
      const validate = ajv.compile(jsonSchema);
      return !validate(parsed);
    } catch (e) {
      return true;
    }
  });

  if (hasJsonValidator && valueType === "json" && jsonSchema) {
    return (
      <div className="form-group">
        <div className="d-flex">
          <label>{label}</label>
          <a
            href="#"
            className="ml-3"
            onClick={(e) => {
              e.preventDefault();
              setRawJSONInput(!rawJSONInput);
            }}
          >
            {rawJSONInput ? "Edit as Form" : "Edit as JSON"}
          </a>
        </div>
        {helpText && <small className="text-muted">{helpText}</small>}
        {rawJSONInput ? (
          <Field
            label=""
            value={value}
            placeholder={placeholder}
            onChange={(e) => {
              setValue(e.target.value);
            }}
            textarea
            minRows={4}
            autoFocus
          />
        ) : (
          <ReactJSONEditor
            schema={jsonSchema}
            value={value}
            setValue={setValue}
          />
        )}
      </div>
    );
  }

  if (valueType === "boolean") {
    return (
      <div className="form-group">
        <label>{label}</label>
        <div>
          <Toggle
            id={id + "__toggle"}
            value={value === "true"}
            setValue={(v) => {
              setValue(v ? "true" : "false");
            }}
            type="featureValue"
          />
          <span className="text-gray font-weight-bold pl-2">
            {value === "true" ? "TRUE" : "FALSE"}
          </span>
        </div>
        {helpText && <small className="text-muted">{helpText}</small>}
      </div>
    );
  }

  return (
    <Field
      label={label}
      value={value}
      placeholder={placeholder}
      onChange={(e) => {
        setValue(e.target.value);
      }}
      {...(valueType === "number"
        ? {
            type: "number",
            step: "any",
            min: "any",
            max: "any",
          }
        : valueType === "json"
        ? { minRows: 4, textarea: true }
        : {
            textarea: true,
            minRows: 1,
          })}
      helpText={helpText}
    />
  );
}

// eslint-disable-next-line
type JSONEditor = any;

declare global {
  interface Window {
    // eslint-disable-next-line
    JSONEditor: JSONEditor;
  }
}

const useScript = (id: string, url: string) => {
  useEffect(() => {
    let script = document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.src = url;
      script.id = id;
      script.async = false;
      document.body.appendChild(script);
    }
  }, [id, url]);
};

function ReactJSONEditor({
  value,
  setValue,
  schema,
}: {
  schema: unknown;
  value: string;
  setValue: (value: string) => void;
}) {
  useScript(
    "jsondditor",
    "//cdn.jsdelivr.net/npm/@json-editor/json-editor@latest/dist/jsoneditor.min.js"
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<JSONEditor>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let timer: NodeJS.Timeout;

    const init = () => {
      if (!window.JSONEditor) {
        timer = setTimeout(init, 300);
        return;
      }

      let initialVal: unknown;
      try {
        initialVal = JSON.parse(value);
      } catch (e) {
        initialVal = {};
      }

      class IconLib extends window.JSONEditor.AbstractIconLib {
        getIcon(key) {
          const mapping = {
            collapse: "▼",
            expand: "▶",
            delete: "✖",
            edit: "✎",
            add: "✚",
            subtract: "-",
            cancel: "✖",
            save: "↓",
            moveup: "⇡",
            movedown: "⇣",
            moveright: "⇢",
            moveleft: "⇠",
            copy: "⧉",
            clear: "✖",
            time: "⏱",
            calendar: "📅",
            upload: "⇧",
            edit_properties: "☰",
          };

          const icon = document.createElement("span");
          icon.innerHTML = mapping[key] || key;
          return icon;
        }
      }

      window.JSONEditor.defaults.iconlibs.unicode = IconLib;

      editorRef.current = new window.JSONEditor(containerRef.current, {
        schema,
        theme: "bootstrap4",
        compact: true,
        disable_collapse: true,
        disable_edit_json: true,
        disable_properties: true,
        disable_array_delete_last_row: true,
        startval: initialVal,
        show_opt_in: true,
        iconlib: "unicode",
      });
      editorRef.current.on("ready", () => {
        editorRef.current.on("change", () => {
          setValue(JSON.stringify(editorRef.current.getValue()));
        });
      });
    };
    init();
    return () => {
      if (timer) clearTimeout(timer);
      if (editorRef.current) {
        editorRef.current.destroy();
      }
    };
    // eslint-disable-next-line
  }, []);

  return <div ref={containerRef}></div>;
}
