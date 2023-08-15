"use client";

import { FC, useState } from "react";
import { Button } from "@nextui-org/button";

interface Props {
	message: string;
}

export const ErrorLabel:FC<Props> = ({message}) => {

	return (
		<div className="bg-red-500 text-white p-2 rounded-md">
			
			<span>{message}</span>
		</div>
	);
};
