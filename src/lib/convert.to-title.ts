 export function toTitleCase(
    value?: string
  ): string | undefined {
    if (!value) return value;

    return value
      .toLowerCase()
      .split(' ')
      .map((word) => {
        // mantém siglas
        if (
          word.length <= 3 &&
          word === word.toUpperCase()
        ) {
          return word;
        }

        return (
          word.charAt(0).toUpperCase() +
          word.slice(1)
        );
      })
      .join(' ');
  }