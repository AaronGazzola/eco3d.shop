"use client";

import { Order, OrderStatus } from "@/types/order.types";
import { useEffect, useState } from "react";

const formatTime = (seconds: number) => {
  if (seconds < 0) return "00:00:00:00";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${days.toString().padStart(2, "0")}d ${hours
    .toString()
    .padStart(2, "0")}h ${minutes.toString().padStart(2, "0")}m ${secs
    .toString()
    .padStart(2, "0")}s`;
};

const OrderCountdown = ({
  order: { printTime, queueTime, status },
}: {
  order: Order;
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(
    status === OrderStatus.Printing ? printTime : queueTime,
  );

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => {
    setTimeLeft(status === OrderStatus.Printing ? printTime : queueTime);
  }, [status, printTime, queueTime]);

  return <span className="">{formatTime(timeLeft)}</span>;
};

export default OrderCountdown;
