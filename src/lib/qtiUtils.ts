/**
 * QTI 2.1 Import/Export Utilities
 * Handles conversion between internal question format and QTI XML
 */

import type { QuestionBankItem } from "@/hooks/useQuestionBank";

/** Export a set of questions to QTI 2.1 XML format */
export function exportToQti(questions: QuestionBankItem[], bankName: string): string {
  const items = questions.map((q, idx) => buildQtiItem(q, idx)).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<assessmentTest xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqti_v2p1 http://www.imsglobal.org/xsd/qti/qtiv2p1/imsqti_v2p1.xsd"
  identifier="${sanitizeXml(bankName)}"
  title="${sanitizeXml(bankName)}">
  <testPart identifier="part1" navigationMode="nonlinear" submissionMode="individual">
    <assessmentSection identifier="section1" title="Questions" visible="true">
${items}
    </assessmentSection>
  </testPart>
</assessmentTest>`;
}

function buildQtiItem(q: QuestionBankItem, idx: number): string {
  const id = `item_${idx + 1}`;
  const options = Array.isArray(q.options) ? q.options : [];

  switch (q.question_type) {
    case "multiple_choice":
      return buildChoiceInteraction(id, q, options, false);
    case "multiple_select":
      return buildChoiceInteraction(id, q, options, true);
    case "true_false":
      return buildChoiceInteraction(id, q, [
        { option_text: "True", is_correct: options.find((o: any) => o.is_correct)?.option_text === "True" },
        { option_text: "False", is_correct: options.find((o: any) => o.is_correct)?.option_text === "False" },
      ], false);
    case "short_answer":
    case "essay":
      return buildExtendedTextInteraction(id, q);
    case "fill_in_blank":
      return buildTextEntryInteraction(id, q);
    case "matching":
      return buildMatchInteraction(id, q);
    case "ordering":
      return buildOrderInteraction(id, q);
    default:
      return buildExtendedTextInteraction(id, q);
  }
}

function buildChoiceInteraction(id: string, q: QuestionBankItem, options: any[], multiple: boolean): string {
  const correctIds = options
    .map((o: any, i: number) => (o.is_correct ? `choice_${i}` : null))
    .filter(Boolean);

  const responseDeclaration = multiple
    ? `<responseDeclaration identifier="RESPONSE" cardinality="multiple" baseType="identifier">
        <correctResponse>${correctIds.map((c: any) => `<value>${c}</value>`).join("")}</correctResponse>
      </responseDeclaration>`
    : `<responseDeclaration identifier="RESPONSE" cardinality="single" baseType="identifier">
        <correctResponse><value>${correctIds[0] || ""}</value></correctResponse>
      </responseDeclaration>`;

  const choiceItems = options
    .map(
      (o: any, i: number) =>
        `          <simpleChoice identifier="choice_${i}">${sanitizeXml(o.option_text || o.text || "")}</simpleChoice>`
    )
    .join("\n");

  return `      <assessmentItem identifier="${id}" title="${sanitizeXml(q.question_text)}" adaptive="false" timeDependent="false">
        ${responseDeclaration}
        <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float">
          <defaultValue><value>${q.points}</value></defaultValue>
        </outcomeDeclaration>
        <itemBody>
          <choiceInteraction responseIdentifier="RESPONSE" shuffle="false" maxChoices="${multiple ? "0" : "1"}">
            <prompt>${sanitizeXml(q.question_text)}</prompt>
${choiceItems}
          </choiceInteraction>
        </itemBody>
      </assessmentItem>`;
}

function buildExtendedTextInteraction(id: string, q: QuestionBankItem): string {
  return `      <assessmentItem identifier="${id}" title="${sanitizeXml(q.question_text)}" adaptive="false" timeDependent="false">
        <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="string"/>
        <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float">
          <defaultValue><value>${q.points}</value></defaultValue>
        </outcomeDeclaration>
        <itemBody>
          <extendedTextInteraction responseIdentifier="RESPONSE">
            <prompt>${sanitizeXml(q.question_text)}</prompt>
          </extendedTextInteraction>
        </itemBody>
      </assessmentItem>`;
}

function buildTextEntryInteraction(id: string, q: QuestionBankItem): string {
  return `      <assessmentItem identifier="${id}" title="${sanitizeXml(q.question_text)}" adaptive="false" timeDependent="false">
        <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="string"/>
        <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float">
          <defaultValue><value>${q.points}</value></defaultValue>
        </outcomeDeclaration>
        <itemBody>
          <p>${sanitizeXml(q.question_text)}</p>
          <textEntryInteraction responseIdentifier="RESPONSE" expectedLength="20"/>
        </itemBody>
      </assessmentItem>`;
}

function buildMatchInteraction(id: string, q: QuestionBankItem): string {
  const pairs = Array.isArray(q.matching_pairs) ? q.matching_pairs : [];
  const sources = pairs.map((p: any, i: number) => `          <simpleAssociableChoice identifier="src_${i}" matchMax="1">${sanitizeXml(p.left || p.term || "")}</simpleAssociableChoice>`).join("\n");
  const targets = pairs.map((p: any, i: number) => `          <simpleAssociableChoice identifier="tgt_${i}" matchMax="1">${sanitizeXml(p.right || p.definition || "")}</simpleAssociableChoice>`).join("\n");

  return `      <assessmentItem identifier="${id}" title="${sanitizeXml(q.question_text)}" adaptive="false" timeDependent="false">
        <responseDeclaration identifier="RESPONSE" cardinality="multiple" baseType="directedPair"/>
        <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float">
          <defaultValue><value>${q.points}</value></defaultValue>
        </outcomeDeclaration>
        <itemBody>
          <matchInteraction responseIdentifier="RESPONSE" shuffle="false">
            <prompt>${sanitizeXml(q.question_text)}</prompt>
            <simpleMatchSet>
${sources}
            </simpleMatchSet>
            <simpleMatchSet>
${targets}
            </simpleMatchSet>
          </matchInteraction>
        </itemBody>
      </assessmentItem>`;
}

function buildOrderInteraction(id: string, q: QuestionBankItem): string {
  const items = Array.isArray(q.ordering_items) ? q.ordering_items : [];
  const choices = items.map((item: any, i: number) => `          <simpleChoice identifier="order_${i}">${sanitizeXml(typeof item === "string" ? item : item.text || "")}</simpleChoice>`).join("\n");

  return `      <assessmentItem identifier="${id}" title="${sanitizeXml(q.question_text)}" adaptive="false" timeDependent="false">
        <responseDeclaration identifier="RESPONSE" cardinality="ordered" baseType="identifier"/>
        <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float">
          <defaultValue><value>${q.points}</value></defaultValue>
        </outcomeDeclaration>
        <itemBody>
          <orderInteraction responseIdentifier="RESPONSE" shuffle="false">
            <prompt>${sanitizeXml(q.question_text)}</prompt>
${choices}
          </orderInteraction>
        </itemBody>
      </assessmentItem>`;
}

/** Parse QTI 2.1 XML into internal question format */
export function parseQtiXml(xmlString: string): Partial<QuestionBankItem>[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "text/xml");
  const items = doc.querySelectorAll("assessmentItem");
  const questions: Partial<QuestionBankItem>[] = [];

  items.forEach((item) => {
    const title = item.getAttribute("title") || "";
    const responseDecl = item.querySelector("responseDeclaration");
    const cardinality = responseDecl?.getAttribute("cardinality") || "single";
    const baseType = responseDecl?.getAttribute("baseType") || "identifier";

    // Determine question type from interaction
    const choiceInteraction = item.querySelector("choiceInteraction");
    const extendedText = item.querySelector("extendedTextInteraction");
    const textEntry = item.querySelector("textEntryInteraction");
    const matchInteraction = item.querySelector("matchInteraction");
    const orderInteraction = item.querySelector("orderInteraction");

    const scoreDecl = item.querySelector('outcomeDeclaration[identifier="SCORE"] defaultValue value');
    const points = scoreDecl ? parseFloat(scoreDecl.textContent || "1") : 1;

    // Get correct response values
    const correctValues = Array.from(
      item.querySelectorAll("correctResponse value")
    ).map((v) => v.textContent || "");

    if (choiceInteraction) {
      const prompt = choiceInteraction.querySelector("prompt")?.textContent || title;
      const choices = Array.from(choiceInteraction.querySelectorAll("simpleChoice"));
      const maxChoices = choiceInteraction.getAttribute("maxChoices");
      const isMultiple = maxChoices === "0" || cardinality === "multiple";

      const isTrueFalse =
        choices.length === 2 &&
        choices.some((c) => (c.textContent || "").trim().toLowerCase() === "true") &&
        choices.some((c) => (c.textContent || "").trim().toLowerCase() === "false");

      const options = choices.map((c) => {
        const cId = c.getAttribute("identifier") || "";
        return {
          option_text: (c.textContent || "").trim(),
          is_correct: correctValues.includes(cId),
        };
      });

      questions.push({
        question_text: prompt,
        question_type: isTrueFalse ? "true_false" : isMultiple ? "multiple_select" : "multiple_choice",
        points,
        options,
      });
    } else if (matchInteraction) {
      const prompt = matchInteraction.querySelector("prompt")?.textContent || title;
      const sets = matchInteraction.querySelectorAll("simpleMatchSet");
      const sources = sets[0] ? Array.from(sets[0].querySelectorAll("simpleAssociableChoice")) : [];
      const targets = sets[1] ? Array.from(sets[1].querySelectorAll("simpleAssociableChoice")) : [];

      const matching_pairs = sources.map((s, i) => ({
        left: (s.textContent || "").trim(),
        right: targets[i] ? (targets[i].textContent || "").trim() : "",
      }));

      questions.push({
        question_text: prompt,
        question_type: "matching",
        points,
        matching_pairs,
      });
    } else if (orderInteraction) {
      const prompt = orderInteraction.querySelector("prompt")?.textContent || title;
      const choices = Array.from(orderInteraction.querySelectorAll("simpleChoice"));
      const ordering_items = choices.map((c) => ({ text: (c.textContent || "").trim() }));

      questions.push({
        question_text: prompt,
        question_type: "ordering",
        points,
        ordering_items,
      });
    } else if (extendedText) {
      const prompt = extendedText.querySelector("prompt")?.textContent || title;
      questions.push({
        question_text: prompt,
        question_type: "essay",
        points,
      });
    } else if (textEntry) {
      questions.push({
        question_text: title,
        question_type: "fill_in_blank",
        points,
      });
    } else {
      questions.push({
        question_text: title,
        question_type: "short_answer",
        points,
      });
    }
  });

  return questions;
}

function sanitizeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Download QTI XML as a file */
export function downloadQtiFile(xml: string, filename: string) {
  const blob = new Blob([xml], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xml") ? filename : `${filename}.xml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
