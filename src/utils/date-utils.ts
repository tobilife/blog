export function formatDate(date: Date): string {
	return new Intl.DateTimeFormat("ko-KR", {
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(date);
}

export function formatDateTime(date: Date): string {
	return new Intl.DateTimeFormat("ko-KR", {
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
}

export function formatDateToYYYYMMDD(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export function getRelativeTime(date: Date): string {
	const now = new Date();
	const diffInMs = now.getTime() - date.getTime();
	const diffInSeconds = Math.floor(diffInMs / 1000);
	const diffInMinutes = Math.floor(diffInSeconds / 60);
	const diffInHours = Math.floor(diffInMinutes / 60);
	const diffInDays = Math.floor(diffInHours / 24);
	const diffInYears = Math.floor(diffInDays / 365);

	if (diffInSeconds < 60) {
		return "방금 전";
	}
	if (diffInMinutes < 60) {
		return `${diffInMinutes}분 전`;
	}
	if (diffInHours < 24) {
		return `${diffInHours}시간 전`;
	}
	if (diffInDays < 365) {
		return `${diffInDays}일 전`;
	}
	return `${diffInYears}년 전`;
}
