import { Card } from "@/components/ui/card";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import useIsMounted from "@/hooks/useIsMounted";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useQueryState } from "nuqs";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const personaliseSchema = z.object({
  primaryMessage: z
    .string()
    .max(30, "Maximum 30 characters allowed")
    .regex(/^[^]*(\n[^]*){0,2}$/, "Maximum 3 lines allowed")
    .refine(
      value => value.split("\n").every(line => line.length <= 10),
      "Each line must be 10 characters or less",
    ),
  secondaryMessage: z
    .string()
    .max(10, "Maximum 10 characters allowed")
    .refine(
      value => !value.includes("\n"),
      "Secondary message must be a single line",
    ),
});

type FormValues = z.infer<typeof personaliseSchema>;

const PersonaliseForm = ({ isAnimating }: { isAnimating: boolean }) => {
  const isMounted = useIsMounted();
  const [isInit, setIsInit] = useState(false);

  const [primaryParam, setPrimaryParam] = useQueryState("primary", {
    defaultValue: "",
    parse: (value: string | null) => value || "Merry\nChristmas\nGrandpa",
  });

  const [secondaryParam, setSecondaryParam] = useQueryState("secondary", {
    defaultValue: "",
    parse: (value: string | null) => value || "From Aaron",
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(personaliseSchema),
    defaultValues: {
      primaryMessage: primaryParam,
      secondaryMessage: secondaryParam,
    },
  });

  const primaryMessage = form.watch("primaryMessage");
  const secondaryMessage = form.watch("secondaryMessage");

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "primaryMessage" && value.primaryMessage !== primaryParam) {
        setPrimaryParam(value.primaryMessage ?? "");
      }
      if (
        name === "secondaryMessage" &&
        value.secondaryMessage !== secondaryParam
      ) {
        setSecondaryParam(value.secondaryMessage ?? "");
      }
    });
    return () => subscription.unsubscribe();
  }, [form, setPrimaryParam, setSecondaryParam, primaryParam, secondaryParam]);

  useEffect(() => {
    if (isMounted && !isInit) {
      setIsInit(true);
      setPrimaryParam(primaryParam);
      setSecondaryParam(secondaryParam);
    }
  }, [
    isMounted,
    setPrimaryParam,
    setSecondaryParam,
    primaryParam,
    secondaryParam,
    isInit,
  ]);

  useEffect(() => {
    form.reset({
      primaryMessage: primaryParam,
      secondaryMessage: secondaryParam,
    });
  }, [primaryParam, secondaryParam, form]);

  const handlePrimaryMessageChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const lines = e.target.value.split("\n");
    const truncatedLines = lines.map(line => line.slice(0, 10));
    const truncatedValue = truncatedLines.join("\n");
    form.setValue("primaryMessage", truncatedValue);
  };

  return (
    <div
      className={cn(
        "w-full h-full",
        isAnimating ? "overflow-hidden" : "overflow-y-auto",
      )}
    >
      <Form {...form}>
        <form className="w-full h-full">
          {/* Large screens */}
          <div className="w-full hidden lg:flex justify-center flex-row">
            <div className="aspect-square w-full max-w-[450px] md:max-w-[400px] flex-shrink-0 flex flex-col">
              <FormField
                control={form.control}
                name="primaryMessage"
                render={({ field }) => (
                  <FormItem className="w-full h-[150px] p-2 mb-6">
                    <FormLabel className="text-gray-800 mb-2 font-medium">
                      Primary Message (3 lines, 10 characters each)
                    </FormLabel>
                    <Textarea
                      {...field}
                      onChange={handlePrimaryMessageChange}
                      className="h-full text-center text-4xl font-['Snell_Roundhand']"
                      placeholder="Merry&#13;&#10;Christmas&#13;&#10;Grandpa"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="secondaryMessage"
                render={({ field }) => (
                  <FormItem className="w-full h-[80px] p-2">
                    <FormLabel className="text-gray-800 mb-2 font-medium">
                      Secondary Message (single line, 10 characters)
                    </FormLabel>
                    <Input
                      {...field}
                      className="h-full text-center text-2xl font-['Futura']"
                      placeholder="From Aaron"
                      maxLength={10}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="aspect-square w-full max-w-[450px] md:max-w-[400px] flex-shrink-0 flex flex-col">
              <div className="w-full h-[66%] p-2">
                <Card className="h-full w-full relative">
                  <div className="absolute inset-0 rounded-xl overflow-hidden flex items-center justify-center">
                    <div className="relative w-full aspect-square scale-125">
                      <Image
                        src="/images/products/V8/details/Aaron set 3-29.jpg"
                        alt="Product preview with primary message"
                        fill
                        className="object-cover"
                        priority
                      />
                    </div>
                  </div>
                </Card>
              </div>
              <div className="w-full h-[33%] p-2">
                <Card className="h-full w-full relative">
                  <div className="absolute inset-0 rounded-xl overflow-hidden flex items-center justify-center">
                    <div className="relative w-full aspect-square scale-[130%] translate-y-9">
                      <Image
                        src="/images/products/V8/details/Aaron set 3-30.jpg"
                        alt="Product preview with secondary message"
                        fill
                        className="object-cover"
                        priority
                      />
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>

          <div className="w-full flex flex-col items-center">
            {/* Small screens */}
            <div className="h-full w-full flex flex-col items-center lg:hidden max-w-[500]">
              <FormField
                control={form.control}
                name="primaryMessage"
                render={({ field }) => (
                  <FormItem className="w-full h-[150px] p-2 mb-6">
                    <FormLabel className="text-gray-800 mb-2 font-medium">
                      Primary Message (3 lines, 10 characters each)
                    </FormLabel>
                    <Textarea
                      {...field}
                      onChange={handlePrimaryMessageChange}
                      className="h-full text-center text-4xl font-['Snell_Roundhand']"
                      placeholder="Merry&#13;&#10;Christmas&#13;&#10;Grandpa"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="w-full h-[248px] p-2">
                <Card className="h-full w-full relative">
                  <div className="absolute inset-0 rounded-xl overflow-hidden flex items-center justify-center">
                    <div className="relative w-full aspect-square">
                      <Image
                        src="/images/products/V8/details/Aaron set 3-29.jpg"
                        alt="Product preview with primary message"
                        fill
                        className="object-cover"
                        priority
                      />
                    </div>
                  </div>
                </Card>
              </div>
              <FormField
                control={form.control}
                name="secondaryMessage"
                render={({ field }) => (
                  <FormItem className="w-full h-[80px] mb-5 p-2 mt-6">
                    <FormLabel className="text-gray-800 mb-2 font-medium">
                      Secondary Message (single line, 10 characters)
                    </FormLabel>
                    <Input
                      {...field}
                      className="h-full text-center text-2xl font-['Futura']"
                      placeholder="From Aaron"
                      maxLength={10}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="w-full h-[116px] p-2">
                <Card className="h-full w-full relative">
                  <div className="absolute inset-0 rounded-xl overflow-hidden flex items-center justify-center">
                    <div className="relative w-full aspect-square translate-y-9 scale-125 xs:scale-110">
                      <Image
                        src="/images/products/V8/details/Aaron set 3-30.jpg"
                        alt="Product preview with secondary message"
                        fill
                        className="object-cover"
                        priority
                      />
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default PersonaliseForm;
